import { randomUUID } from "node:crypto";
import { ConnectedAccount } from "@core/domain/connected-account/connected-account";
import { and, db, eq, inArray } from "@core/helpers/db";
import { Storage } from "@core/helpers/storage";
import type { ConnectedAccountSelect } from "@core/schemas/connected-account.sql";
import {
  type SharedAttachmentSpec,
  type UnifiedContentMetrics,
  unifiedContentTable,
} from "@core/schemas/content.sql";
import { Log } from "@core/utils/log";

export type BackfillParams = {
  connectedAccountId: string;
  start: Date;
  end: Date;
};

export type BackfillResult = {
  fetched: number;
  inserted: number;
  skipped: number;
};

export type NormalizedBackfillItem = {
  id: string;
  createdAt: Date;
  attachments: SharedAttachmentSpec[];
};

export type MirrorConfig = {
  photoLabel: string;
  videoThumbnailLabel: string;
  storagePrefix: string;
  platformTag: string;
};

export type BaseBackfillerDependencies = {
  storage?: typeof Storage;
  fetch?: typeof fetch;
  logger?: ReturnType<typeof Log.create>;
};

type DeduplicationResult<TNormalized> = {
  existing: Set<string>;
  toInsert: TNormalized[];
};

export abstract class BaseBackfiller<
  TNormalized extends NormalizedBackfillItem,
  TContext,
  TRaw,
> {
  protected readonly storage: typeof Storage;
  protected readonly fetch: typeof fetch;
  protected readonly log: ReturnType<typeof Log.create>;

  private readonly consolePrefix: string;

  constructor(
    options: {
      namespace: string;
      consolePrefix: string;
    },
    dependencies: BaseBackfillerDependencies = {},
  ) {
    this.storage = dependencies.storage ?? Storage;
    this.fetch = dependencies.fetch ?? fetch;
    this.log =
      dependencies.logger ?? Log.create({ namespace: options.namespace });
    this.consolePrefix = options.consolePrefix;
  }

  async backfill(params: BackfillParams): Promise<BackfillResult> {
    this.step("1", "Starting backfill");
    this.assertTimeRange(params.start, params.end);

    const { connectedAccountId, start, end } = params;
    this.step("2", "Loading connected account", { connectedAccountId });
    const baseAccount = await ConnectedAccount.fromID(connectedAccountId);
    await this.assertPlatform(baseAccount);

    this.step("3", "Preparing platform account", {
      externalAccountId: baseAccount.externalAccountId,
    });
    const { platformAccount, context } = await this.prepareAccount(baseAccount);

    const contextLog = this.contextLogData(context);
    this.step("4", "Fetching published items", {
      ...contextLog,
      start: start.toISOString(),
      end: end.toISOString(),
    });
    const rawItems = await this.fetchRawItems(context, start, end);
    this.log.info("backfill fetched raw items", {
      count: rawItems.length,
      ...contextLog,
    });
    this.step("5", "Fetched items", { count: rawItems.length });

    if (rawItems.length === 0) {
      this.step("6", "No items fetched, returning early");
      return { fetched: 0, inserted: 0, skipped: 0 };
    }

    this.step("7", "Normalizing items");
    const normalized = rawItems
      .map((item) => this.normalizeItem(item, context))
      .filter((item): item is TNormalized => Boolean(item));
    this.step("8", "Normalized items", {
      count: normalized.length,
      skipped: rawItems.length - normalized.length,
    });

    if (normalized.length === 0) {
      this.step("9", "No normalized items, returning early");
      return {
        fetched: rawItems.length,
        inserted: 0,
        skipped: rawItems.length,
      };
    }

    this.step("10", "Filtering existing items");
    const deduped = await this.filterExisting(platformAccount.id, normalized);
    this.step("11", "Deduplication result", {
      toInsert: deduped.toInsert.length,
      existing: deduped.existing.size,
    });

    const metricTargets = this.metricTargets(deduped, normalized);
    let metricsById = new Map<string, UnifiedContentMetrics>();
    if (metricTargets.length > 0) {
      this.step("11.5", "Fetching metrics for candidate items", {
        targetCount: metricTargets.length,
        forInsertion: deduped.toInsert.length,
      });
      metricsById = await this.fetchMetrics(metricTargets, context);
      this.step("11.6", "Metrics fetch completed", {
        fetched: metricsById.size,
      });
    }

    if (deduped.toInsert.length === 0) {
      this.step("12", "All items already exist, returning early");
      return {
        fetched: rawItems.length,
        inserted: 0,
        skipped: normalized.length,
      };
    }

    this.step("13", "Starting attachment mirroring", {
      count: deduped.toInsert.length,
    });
    await this.mirrorAttachments(
      deduped.toInsert,
      platformAccount.workspaceId,
      this.mirrorConfig(),
    );
    this.step("14", "Attachment mirroring completed");

    this.step("15", "Inserting items into database", {
      count: deduped.toInsert.length,
    });
    await this.insertPosts(
      deduped.toInsert,
      platformAccount,
      context,
      metricsById,
    );
    this.step("16", "Database insertion completed");

    const result = {
      fetched: rawItems.length,
      inserted: deduped.toInsert.length,
      skipped: normalized.length - deduped.toInsert.length,
    };
    this.step("17", "Backfill completed", result);
    return result;
  }

  protected step(
    step: string,
    message: string,
    extra?: Record<string, unknown>,
  ) {
    const prefix = this.consolePrefix ? `${this.consolePrefix}${step}` : step;
    if (extra && Object.keys(extra).length > 0) {
      console.log(`[${prefix}] ${message}`, extra);
    } else {
      console.log(`[${prefix}] ${message}`);
    }
  }

  protected assertTimeRange(start: Date, end: Date) {
    if (!(start instanceof Date) || Number.isNaN(start.getTime())) {
      throw new Error("start must be a valid Date");
    }
    if (!(end instanceof Date) || Number.isNaN(end.getTime())) {
      throw new Error("end must be a valid Date");
    }
    if (start.getTime() >= end.getTime()) {
      throw new Error("start must be before end");
    }
  }

  protected async filterExisting(
    connectedAccountId: string,
    items: TNormalized[],
  ): Promise<DeduplicationResult<TNormalized>> {
    const ids = items.map((item) => item.id);
    if (ids.length === 0) {
      return {
        existing: new Set<string>(),
        toInsert: [],
      };
    }

    const existing = await db()
      .select({ sourceContentId: unifiedContentTable.sourceContentId })
      .from(unifiedContentTable)
      .where(
        and(
          eq(unifiedContentTable.connectedAccountId, connectedAccountId),
          inArray(unifiedContentTable.sourceContentId, ids),
        ),
      );

    const existingSet = new Set(
      existing
        .map((row) => row.sourceContentId)
        .filter((value): value is string => Boolean(value)),
    );

    const toInsert = items.filter((item) => !existingSet.has(item.id));
    return { existing: existingSet, toInsert };
  }

  protected async mirrorAttachments(
    items: TNormalized[],
    workspaceId: string,
    config: MirrorConfig,
  ): Promise<void> {
    if (items.length === 0) return;

    const cache = new Map<
      string,
      { key: string; url: string; contentType: string }
    >();

    for (const item of items) {
      for (let index = 0; index < item.attachments.length; index += 1) {
        const attachment = item.attachments[index];

        if (attachment.type === "photo") {
          const sourceUrl = attachment.publicUrl ?? attachment.thumbnailUrl;
          if (!sourceUrl) continue;

          const mirrored = await this.mirrorUrlToR2(
            cache,
            sourceUrl,
            workspaceId,
            {
              label: config.photoLabel,
              itemId: item.id,
              attachmentId: attachment.id ?? `${index}`,
              storagePrefix: config.storagePrefix,
              platformTag: config.platformTag,
            },
          );

          if (!mirrored) continue;

          attachment.publicUrl = mirrored.url;
          attachment.thumbnailUrl = mirrored.url;
          attachment.metadata = this.mergeAttachmentMetadata(
            attachment.metadata,
            {
              r2: {
                bucket: this.storage.PUBLIC_BUCKET.name,
                key: mirrored.key,
                contentType: mirrored.contentType,
              },
            },
          );
        } else if (attachment.type === "video") {
          const thumbnailUrl = attachment.thumbnailUrl;
          if (!thumbnailUrl) continue;

          const mirrored = await this.mirrorUrlToR2(
            cache,
            thumbnailUrl,
            workspaceId,
            {
              label: config.videoThumbnailLabel,
              itemId: item.id,
              attachmentId: attachment.id ?? `${index}`,
              storagePrefix: config.storagePrefix,
              defaultExtension: "jpg",
              platformTag: config.platformTag,
            },
          );

          if (!mirrored) continue;

          attachment.thumbnailUrl = mirrored.url;
          attachment.metadata = this.mergeAttachmentMetadata(
            attachment.metadata,
            {
              r2Thumbnail: {
                bucket: this.storage.PUBLIC_BUCKET.name,
                key: mirrored.key,
                contentType: mirrored.contentType,
              },
            },
          );
        }
      }
    }
  }

  private async mirrorUrlToR2(
    cache: Map<string, { key: string; url: string; contentType: string }>,
    sourceUrl: string,
    workspaceId: string,
    context: {
      label: string;
      itemId: string;
      attachmentId: string;
      storagePrefix: string;
      platformTag: string;
      defaultExtension?: string;
    },
  ): Promise<{ key: string; url: string; contentType: string } | null> {
    const cached = cache.get(sourceUrl);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.fetch(sourceUrl);
      if (!response.ok || !response.body) {
        return null;
      }

      const contentTypeHeader =
        response.headers.get("content-type") ?? undefined;
      const contentType = contentTypeHeader ?? "image/jpeg";
      const extension =
        this.extensionFromContentType(contentType) ??
        context.defaultExtension ??
        "jpg";

      const fileName = `${context.label}-${context.itemId}-${context.attachmentId}-${randomUUID()}.${extension}`;
      const key = this.storage.Key.workspace(
        workspaceId,
        context.storagePrefix,
        fileName,
      );

      const upload = await this.storage.upload(
        key,
        response.body as ReadableStream<Uint8Array>,
        this.storage.PUBLIC_BUCKET,
        {
          contentType,
          metadata: {
            workspaceId,
            platform: context.platformTag,
            sourceUrl,
            itemId: context.itemId,
            attachmentId: context.attachmentId,
            label: context.label,
          },
        },
      );

      const result = {
        key: upload.key,
        url: upload.url,
        contentType,
      };

      cache.set(sourceUrl, result);
      return result;
    } catch (error) {
      this.log.warn("failed to mirror attachment to R2", {
        sourceUrl,
        error: (error as Error).message,
      });
      return null;
    }
  }

  private extensionFromContentType(contentType: string | null | undefined) {
    if (!contentType) return null;
    const normalized = contentType.toLowerCase();
    const map: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
      "image/avif": "avif",
    };
    return map[normalized] ?? null;
  }

  protected mergeAttachmentMetadata(
    metadata: SharedAttachmentSpec["metadata"],
    extra: Record<string, unknown>,
  ): Record<string, unknown> {
    const base = (metadata as Record<string, unknown> | undefined) ?? {};
    return {
      ...base,
      storage: {
        ...((base.storage as Record<string, unknown>) ?? {}),
        ...extra,
      },
    } satisfies Record<string, unknown>;
  }

  protected metricTargets(
    deduped: DeduplicationResult<TNormalized>,
    normalized: TNormalized[],
  ): TNormalized[] {
    return deduped.toInsert.length > 0 ? deduped.toInsert : normalized;
  }

  protected contextLogData(_context: TContext): Record<string, unknown> {
    return {};
  }

  protected abstract assertPlatform(
    account: ConnectedAccountSelect,
  ): void | Promise<void>;

  protected abstract prepareAccount(account: ConnectedAccountSelect): Promise<{
    platformAccount: ConnectedAccountSelect;
    context: TContext;
  }>;

  protected abstract fetchRawItems(
    context: TContext,
    start: Date,
    end: Date,
  ): Promise<TRaw[]>;

  protected abstract normalizeItem(
    item: TRaw,
    context: TContext,
  ): TNormalized | null;

  protected abstract fetchMetrics(
    items: TNormalized[],
    context: TContext,
  ): Promise<Map<string, UnifiedContentMetrics>>;

  protected abstract insertPosts(
    items: TNormalized[],
    account: ConnectedAccountSelect,
    context: TContext,
    metricsById: Map<string, UnifiedContentMetrics>,
  ): Promise<void>;

  protected abstract mirrorConfig(): MirrorConfig;
}
