import { ConnectedAccount } from "@core/domain/connected-account/connected-account";
import { Actor } from "@core/helpers/actor";
import { Binding } from "@core/helpers/api-env";
import { and, count, db, eq } from "@core/helpers/db";
import { ImageStorage } from "@core/helpers/storage/image";
import { VideoStorage } from "@core/helpers/storage/video";
import {
  type ContentPublishingStatus,
  FBFeedPlacementSpec,
  type PlacementSpec,
  pendingContentGroupTable,
  type SharedAttachmentSpec,
  UnifiedContentInsert,
  type UnifiedContentSelect,
  UnifiedContentUpdate,
  unifiedContentTable,
} from "@core/schemas/content.sql";
import { fn } from "@core/utils/fn";
import { EntUnifiedContentBase } from "./base";

export class EntPendingContent extends EntUnifiedContentBase {
  protected async deleteSrc(): Promise<void> {
    await EntPendingContent.killWorkflow(this.data.id);
    return Promise.resolve();
  }
  static async killWorkflow(id: string) {
    const { WORKFLOW } = Binding.use();
    try {
      const wf = await WORKFLOW.get(id);
      await wf.terminate();
      return Promise.resolve();
    } catch (_e) {
      // probably workflow not found, ignore
      return Promise.resolve();
    }
  }
  override isPublished(): boolean {
    return (
      this.data.publishingStatus === "PUBLISHED" && !!this.data.sourceContentId
    );
  }
  static async fromID(id: string): Promise<EntPendingContent> {
    return new EntPendingContent(await EntUnifiedContentBase._fromID(id));
  }
  override fromUnifiedContent(
    data: UnifiedContentSelect,
  ): EntUnifiedContentBase {
    return new EntPendingContent(data);
  }
  async toScheduledContent(): Promise<
    import("./scheduled-content").EntScheduledContent
  > {
    // Import moved to separate file to avoid circular dependency
    // Using dynamic import to avoid circular dependency at module level
    const { EntScheduledContent } = await import("./scheduled-content");
    return new EntScheduledContent(this.data);
  }
  static createManyInternal = fn(
    UnifiedContentInsert.omit({ workspaceId: true }).array(),
    async (items) => {
      const actor = Actor.assert("workspace_user");
      if (items.length === 0) throw new Error("No items to create");
      return await db()
        .insert(unifiedContentTable)
        .values(
          items.map((item) => ({
            ...item,
            workspaceId: actor.properties.workspaceID,
          })),
        )
        .returning();
    },
  );
  static createInternal = fn(
    UnifiedContentInsert.omit({ workspaceId: true }),
    async ({
      placementSpec,
      publishingStatus,
      pendingContentGroupId,
      connectedAccountId,
    }) => {
      const actor = Actor.assert("workspace_user");
      if (!placementSpec) throw new Error("Invalid placementSpec");
      // 1. insert record
      const [c] = await db()
        .insert(unifiedContentTable)
        .values({
          placement: placementSpec.placement,
          workspaceId: actor.properties.workspaceID,
          connectedAccountId: connectedAccountId,
          placementSpec: placementSpec,
          pendingContentGroupId,
          publishingStatus,
        })
        .returning();
      // 2. kickoff workflow
      const { WORKFLOW } = Binding.use();
      try {
        // TODO: better tenant based ID?
        const wf = await WORKFLOW.create({
          id: `${c.id}`,
          params: {
            actor,
            pendingContentID: c.id,
          },
        });
        return { c, wf };
      } catch (e) {
        console.error("workflow already exists", e);
        throw e;
      }
    },
  );
  update = fn(
    UnifiedContentUpdate.pick({
      placementSpec: true,
      publishingStatus: true,
      schedulingSpec: true,
    }),
    async (input) => {
      // 1. update record
      const [c] = await db()
        .update(unifiedContentTable)
        .set({
          ...input,
        })
        .where(
          and(
            eq(unifiedContentTable.id, this.data.id),
            eq(unifiedContentTable.workspaceId, Actor.workspaceID()),
          ),
        )
        .returning();
      if (!c) throw new Error("Failed to update content");
      // 2. kill any existing workflow, and restart
      const { WORKFLOW } = Binding.use();
      try {
        const wf = await WORKFLOW.get(c.id);
        await wf.terminate();
      } catch (e) {
        console.warn("no existing workflow to terminate", e);
      }
      try {
        const wf = await WORKFLOW.create({
          id: `${c.id}`,
          params: {
            actor: Actor.assert("workspace_user"),
            pendingContentID: c.id,
          },
        });
        return { c, wf };
      } catch (e) {
        console.error("workflow already exists", e);
        throw e;
      }
    },
  );
  static async _createDummy(pageID?: string): Promise<EntPendingContent> {
    const acc = await ConnectedAccount._createDummy();
    const thumbnailUrl = "https://picsum.photos/200/300";
    const content = await EntPendingContent.create({
      placement: "FB_FEED",
      connectedAccountId: acc.id,
      publishingStatus: "SCHEDULED",
      placementSpec: {
        identity: {
          connectedAccountID: acc.id,
          fbPageID: pageID ?? acc.externalAccountId,
          metadata: {
            pageID: pageID ?? acc.externalAccountId,
          },
        },
        placement: "FB_FEED",
        attachments: [
          {
            type: "photo",
            id: "your_mom",
            thumbnailUrl,
          },
          {
            type: "video",
            id: "your_mom_again",
            thumbnailUrl,
          },
        ],
        postSpec: {
          message: "trust me bro - from openpromo",
        },
      },
    });
    // create a pending group that backs it
    await db()
      .insert(pendingContentGroupTable)
      .values({
        publishingStatus: "SCHEDULED",
        workspaceId: Actor.workspaceID(),
      })
      .returning();
    return new EntPendingContent(content);
  }
  facebookFeedPlacementSpec(): FBFeedPlacementSpec {
    const p = this.placement();
    if (p !== "FB_FEED") {
      throw new Error(`Content ${this.data.id} is not FB_FEED placement`);
    }
    const {
      data: spec,
      success,
      error,
    } = FBFeedPlacementSpec.safeParse(this.data.placementSpec);
    if (!spec || !success || error) {
      throw new Error(`Invalid placementSpec for content ${this.data.id}`);
    }
    return spec;
  }
  hasVideoAttachment() {
    return (
      this.data.placementSpec?.attachments?.some((a) => a.type === "video") ??
      false
    );
  }
  hasPhotoAttachment() {
    return (
      this.data.placementSpec?.attachments?.some((a) => a.type === "photo") ??
      false
    );
  }
  onlyOneAttachment() {
    return (this.data.placementSpec?.attachments?.length ?? 0) === 1;
  }
  photosAttachments() {
    return (
      this.data.placementSpec?.attachments?.filter((a) => a.type === "photo") ??
      []
    );
  }
  videoAttachments() {
    return (
      this.data.placementSpec?.attachments?.filter((a) => a.type === "video") ??
      []
    );
  }
  attachments() {
    return this.data.placementSpec?.attachments ?? [];
  }

  async initiateVideoDownloads(): Promise<{ id: string; status: string }[]> {
    const videos = this.videoAttachments();
    if (videos.length === 0) {
      return [];
    }

    const downloadStatuses: { id: string; status: string }[] = [];

    for (const video of videos) {
      const download = await VideoStorage.createMP4Download(video.id);
      downloadStatuses.push({
        id: video.id,
        status: download.default?.status || "unknown",
      });
    }

    return downloadStatuses;
  }

  async checkVideoDownloadStatus(videoId: string) {
    const download = await VideoStorage.createMP4Download(videoId);

    return {
      id: videoId,
      status: download.default?.status,
      url: download.default?.url,
    };
  }

  async getReadyVideoDownloads(): Promise<
    { id: string; downloadUrl: string }[]
  > {
    const videos = this.videoAttachments();
    const readyVideos: { id: string; downloadUrl: string }[] = [];

    for (const video of videos) {
      const status = await this.checkVideoDownloadStatus(video.id);

      if (status.status === "ready") {
        if (!status.url) {
          throw new Error(
            `Video download ${video.id} is ready but missing URL`,
          );
        }
        readyVideos.push({
          id: video.id,
          downloadUrl: status.url,
        });
      } else if (status.status === "error") {
        throw new Error(`Video download ${video.id} failed`);
      }
    }

    return readyVideos;
  }

  async updateVideoAttachmentsWithUrls(
    readyVideos: { id: string; downloadUrl: string }[],
  ): Promise<EntPendingContent> {
    if (readyVideos.length === 0) return this;

    const urlMap = new Map(readyVideos.map((v) => [v.id, v.downloadUrl]));

    const didUpdate = await this.updateAttachments((attachment) => {
      if (attachment.type === "video" && urlMap.has(attachment.id)) {
        return {
          ...attachment,
          presignedUrl: urlMap.get(attachment.id),
        };
      }
      return attachment;
    });

    if (!didUpdate) return this;

    return new EntPendingContent(this.data);
  }
  async setPublishingStatus(
    publishingStatus: ContentPublishingStatus,
  ): Promise<EntPendingContent> {
    const [newOne] = await db()
      .update(unifiedContentTable)
      .set({ publishingStatus })
      .where(eq(unifiedContentTable.id, this.data.id))
      .returning();
    if (!newOne) throw new Error("failed to update publishingStatus");
    return new EntPendingContent(newOne);
  }
  async markAsPublished(publishedContentID: string) {
    const groupID = this.data.pendingContentGroupId;
    const [newOne] = await db()
      .update(unifiedContentTable)
      .set({
        publishingStatus: "PUBLISHED",
        sourceContentId: publishedContentID,
        pendingContentGroupId: null,
      })
      .where(eq(unifiedContentTable.id, this.data.id))
      .returning();
    if (!newOne) throw new Error("failed to mark content as published");
    this.data = newOne;

    if (!groupID) return;
    // if group is now empty, delete it
    const [{ count: contentCount }] = await db()
      .select({ count: count() })
      .from(unifiedContentTable)
      .where(
        and(
          eq(unifiedContentTable.pendingContentGroupId, groupID),
          eq(unifiedContentTable.workspaceId, Actor.workspaceID()),
        ),
      );

    if (contentCount === 0) {
      await db()
        .delete(pendingContentGroupTable)
        .where(
          and(
            eq(pendingContentGroupTable.id, groupID),
            eq(pendingContentGroupTable.workspaceId, Actor.workspaceID()),
          ),
        );
    }
  }

  public async deleteLocalAttachmentAssets(): Promise<void> {
    const attachments = this.attachments();
    if (attachments.length === 0) return;

    const localAttachments = attachments.filter((attachment) => {
      if (!attachment?.id) return false;
      const metadata = attachment.metadata as
        | { localAssetDeleted?: boolean }
        | undefined;
      return metadata?.localAssetDeleted !== true;
    });

    if (localAttachments.length === 0) return;

    await this.deleteAttachmentAssets(localAttachments);
  }

  protected async updateAttachments(
    mapper: (
      attachment: SharedAttachmentSpec,
      index: number,
    ) => SharedAttachmentSpec,
    placementUpdater?: (spec: PlacementSpec) => PlacementSpec,
  ): Promise<boolean> {
    const attachments =
      (
        this.data.placementSpec?.attachments as
          | SharedAttachmentSpec[]
          | undefined
      )?.map((attachment) => ({ ...attachment })) ?? [];

    if (attachments.length === 0) return false;

    let changed = false;
    const updatedAttachments = attachments.map((attachment, index) => {
      const updated = mapper({ ...attachment }, index);
      if (!changed && JSON.stringify(updated) !== JSON.stringify(attachment)) {
        changed = true;
      }
      return updated;
    });

    if (!changed) return false;

    await this.replaceAttachments(updatedAttachments, placementUpdater);
    return true;
  }

  private async replaceAttachments(
    updatedAttachments: SharedAttachmentSpec[],
    placementUpdater?: (spec: PlacementSpec) => PlacementSpec,
  ): Promise<void> {
    const placementSpec = this.data.placementSpec as PlacementSpec | undefined;
    if (!placementSpec) return;

    const baseSpec = {
      ...placementSpec,
      attachments: updatedAttachments,
    } satisfies PlacementSpec;

    const nextSpec = placementUpdater ? placementUpdater(baseSpec) : baseSpec;

    const [newData] = await db()
      .update(unifiedContentTable)
      .set({
        placementSpec: nextSpec,
      })
      .where(eq(unifiedContentTable.id, this.data.id))
      .returning();

    if (!newData || !newData.placementSpec) {
      console.error("Failed to update placementSpec", { newData });
      throw new Error(
        `Failed to update placementSpec for content ${this.data.id}`,
      );
    }

    this.data = newData;
  }

  protected async deleteAttachmentAssets(
    attachments: SharedAttachmentSpec[],
  ): Promise<void> {
    const seen = new Set<string>();

    for (const attachment of attachments) {
      if (!attachment?.id) continue;
      const key = `${attachment.type}:${attachment.id}`;
      if (seen.has(key)) continue;
      seen.add(key);

      try {
        if (attachment.type === "photo") {
          await ImageStorage.deleteImage(attachment.id);
        } else if (attachment.type === "video") {
          await VideoStorage.deleteVideo(attachment.id);
        }
      } catch (error) {
        console.warn(
          `failed to delete ${attachment.type} asset ${attachment.id}`,
          error,
        );
      }
    }
  }
}
