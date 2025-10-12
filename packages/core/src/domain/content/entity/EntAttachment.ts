import { randomUUID } from "node:crypto";

import { Ent } from "@core/helpers/ent";
import { Storage } from "@core/helpers/storage";
import { ImageStorage } from "@core/helpers/storage/image";
import { VideoStorage } from "@core/helpers/storage/video";
import type { SharedAttachmentSpec } from "@core/schemas/content.sql";
import { Log } from "@core/utils/log";

export type AttachmentKind = SharedAttachmentSpec["type"];

export type AttachmentLifecycleState =
  | "pending"
  | "uploaded"
  | "mirrored"
  | "ready"
  | "archived";

export type AttachmentLocationKind =
  | "cloudflare_image"
  | "cloudflare_stream"
  | "r2"
  | "remote"
  | "upload";

export interface AttachmentLocationBase {
  kind: AttachmentLocationKind;
  label?: string;
}

export interface CloudflareImageLocation extends AttachmentLocationBase {
  kind: "cloudflare_image";
  imageId: string;
  variant?: string;
  url?: string;
}

export interface CloudflareStreamLocation extends AttachmentLocationBase {
  kind: "cloudflare_stream";
  videoId: string;
  playbackUrl?: string;
  thumbnailUrl?: string;
}

export interface R2Location extends AttachmentLocationBase {
  kind: "r2";
  key: string;
  bucket: string;
  url?: string;
}

export interface RemoteLocation extends AttachmentLocationBase {
  kind: "remote";
  platform: string;
  id?: string;
  url?: string;
  expiresAt?: string;
}

export interface UploadLocation extends AttachmentLocationBase {
  kind: "upload";
  url: string;
  expiresAt?: string;
}

export type AttachmentLocation =
  | CloudflareImageLocation
  | CloudflareStreamLocation
  | R2Location
  | RemoteLocation
  | UploadLocation;

export interface AttachmentDimensions {
  width?: number | null;
  height?: number | null;
}

export type AttachmentMetadata = Record<string, Rpc.Serializable<unknown>>;

export interface AttachmentData {
  id: string;
  workspaceId: string;
  kind: AttachmentKind;
  state: AttachmentLifecycleState;
  primary: AttachmentLocation;
  mirrors: AttachmentLocation[];
  preview?: AttachmentLocation;
  metadata?: AttachmentMetadata;
  mimeType?: string;
  dimensions?: AttachmentDimensions;
  duration?: number | null;
  altText?: string;
}

export type AttachmentDependencies = {
  imageStorage?: typeof ImageStorage;
  videoStorage?: typeof VideoStorage;
  storage?: typeof Storage;
  fetch?: typeof fetch;
  logger?: ReturnType<typeof Log.create>;
};

export class EntAttachment extends Ent<AttachmentData> {
  static override type = "attachment";

  private readonly imageStorage: typeof ImageStorage;
  private readonly videoStorage: typeof VideoStorage;
  private readonly storage: typeof Storage;
  private readonly fetchFn: typeof fetch;
  private readonly log: ReturnType<typeof Log.create>;

  constructor(data: AttachmentData, dependencies: AttachmentDependencies = {}) {
    super(data);
    this.imageStorage = dependencies.imageStorage ?? ImageStorage;
    this.videoStorage = dependencies.videoStorage ?? VideoStorage;
    this.storage = dependencies.storage ?? Storage;
    this.fetchFn = dependencies.fetch ?? fetch;
    this.log =
      dependencies.logger ??
      Log.create({ namespace: "ent-attachment", attachmentId: data.id });
    this.log.info("attachment instance created");
  }

  static fromSharedSpec(
    workspaceId: string,
    spec: SharedAttachmentSpec,
    options: Partial<Omit<AttachmentData, "id" | "workspaceId" | "kind">> = {},
  ): EntAttachment {
    const primary =
      options.primary ??
      derivePrimaryLocationFromSpec(spec) ??
      fallbackLocation(spec);

    const preview = options.preview ?? derivePreviewLocation(spec);

    const data: AttachmentData = {
      id: spec.id,
      workspaceId,
      kind: spec.type,
      state: options.state ?? inferInitialState(primary),
      primary,
      mirrors: options.mirrors ?? [],
      preview,
      metadata: options.metadata ?? sanitizeMetadata(spec.metadata),
      mimeType: spec.mimeType,
      dimensions: collectDimensions(spec, options.dimensions),
      duration: collectDuration(spec, options.duration),
      altText: spec.type === "photo" ? spec.altText : options.altText,
    } satisfies AttachmentData;

    return new EntAttachment(data);
  }

  get kind(): AttachmentKind {
    return this.data.kind;
  }

  get state(): AttachmentLifecycleState {
    return this.data.state;
  }

  get workspaceId(): string {
    return this.data.workspaceId;
  }

  get metadata(): Record<string, unknown> | undefined {
    return this.data.metadata;
  }

  primaryLocation(): AttachmentLocation {
    return this.data.primary;
  }

  previewLocation(): AttachmentLocation | undefined {
    return this.data.preview;
  }

  mirrors(): AttachmentLocation[] {
    return [...this.data.mirrors];
  }

  updateState(next: AttachmentLifecycleState): this {
    this.data.state = next;
    return this;
  }

  setPrimaryLocation(location: AttachmentLocation): this {
    this.data.primary = location;
    return this;
  }

  promoteMirrorToPrimary(kind: AttachmentLocationKind): this {
    const mirror = this.data.mirrors.find((item) => item.kind === kind);
    if (!mirror) return this;
    this.data.primary = mirror;
    this.data.mirrors = this.data.mirrors.filter((item) => item !== mirror);
    return this;
  }

  addMirror(location: AttachmentLocation): this {
    const signature = this.locationSignature(location);
    const next = this.data.mirrors.filter(
      (item) => this.locationSignature(item) !== signature,
    );
    next.push(location);
    this.data.mirrors = next;
    return this;
  }

  removeMirror(kind: AttachmentLocationKind): this {
    this.data.mirrors = this.data.mirrors.filter((item) => item.kind !== kind);
    return this;
  }

  async ensureR2Mirror(
    options: { overwrite?: boolean; cacheKey?: string } = {},
  ): Promise<R2Location> {
    const existing = this.data.mirrors.find(
      (item): item is R2Location => item.kind === "r2",
    );

    if (existing && !options.overwrite) {
      return existing;
    }

    if (this.data.primary.kind === "r2" && !options.overwrite) {
      return this.data.primary as R2Location;
    }

    const sourceUrl = await this.resolveLocationUrl(this.data.primary);
    if (!sourceUrl) {
      throw new Error(
        "attachment primary location does not expose a public URL",
      );
    }

    const response = await this.fetchFn(sourceUrl);
    if (!response.ok || !response.body) {
      throw new Error(
        `failed to fetch attachment source (${response.status} ${response.statusText})`,
      );
    }

    const key =
      options.cacheKey ??
      `attachments/${this.workspaceId}/${this.data.id}/${randomUUID()}`;
    const upload = await this.storage.upload(
      key,
      response.body as ReadableStream<Uint8Array>,
      this.storage.PUBLIC_BUCKET,
      {
        contentType: this.data.mimeType,
        metadata: {
          workspaceId: this.workspaceId,
          attachmentId: this.data.id,
          originKind: this.data.primary.kind,
        },
      },
    );

    const location: R2Location = {
      kind: "r2",
      key: upload.key,
      bucket: this.storage.PUBLIC_BUCKET.name,
      url: upload.url,
    };

    this.addMirror(location);
    this.updateState("mirrored");
    return location;
  }

  async toSharedSpec(): Promise<SharedAttachmentSpec> {
    const preferred = this.selectPreferredLocation();
    const publicUrl = await this.resolveLocationUrl(preferred);
    const uploadLocation = this.findLocation("upload") as
      | UploadLocation
      | undefined;
    const r2Location =
      preferred.kind === "r2"
        ? (preferred as R2Location)
        : (this.findLocation("r2") as R2Location | undefined);

    if (this.data.kind === "photo") {
      return {
        type: "photo",
        id: this.data.id,
        publicUrl: publicUrl ?? undefined,
        presignedUrl: uploadLocation?.url,
        s3Key: r2Location?.key,
        thumbnailUrl: await this.resolvePreviewUrl(),
        metadata: this.data.metadata,
        mimeType: this.data.mimeType,
        width: this.data.dimensions?.width ?? undefined,
        height: this.data.dimensions?.height ?? undefined,
        altText: this.data.altText,
      } satisfies SharedAttachmentSpec;
    }

    return {
      type: "video",
      id: this.data.id,
      publicUrl: publicUrl ?? undefined,
      presignedUrl: uploadLocation?.url,
      s3Key: r2Location?.key,
      metadata: this.data.metadata,
      mimeType: this.data.mimeType,
      duration: this.data.duration ?? undefined,
      width: this.data.dimensions?.width ?? undefined,
      height: this.data.dimensions?.height ?? undefined,
      thumbnailUrl: await this.resolvePreviewUrl(),
    } satisfies SharedAttachmentSpec;
  }

  private findLocation(
    kind: AttachmentLocationKind,
  ): AttachmentLocation | undefined {
    if (this.data.primary.kind === kind) return this.data.primary;
    const mirror = this.data.mirrors.find((item) => item.kind === kind);
    if (mirror) return mirror;
    if (this.data.preview?.kind === kind) return this.data.preview;
    return undefined;
  }

  private selectPreferredLocation(): AttachmentLocation {
    const r2Mirror = this.data.mirrors.find((item) => item.kind === "r2");
    if (r2Mirror) return r2Mirror;
    if (this.data.primary.kind === "r2") return this.data.primary;
    return this.data.primary;
  }

  private async resolvePreviewUrl(): Promise<string | undefined> {
    if (!this.data.preview) return undefined;
    return await this.resolveLocationUrl(this.data.preview);
  }

  private async resolveLocationUrl(
    location: AttachmentLocation,
  ): Promise<string | undefined> {
    switch (location.kind) {
      case "r2": {
        return (
          location.url ??
          this.storage.publicUrl(location.key, { name: location.bucket })
        );
      }
      case "cloudflare_image": {
        return (
          location.url ??
          (await this.imageStorage.getImageDeliveryUrl(
            location.imageId,
            location.variant ?? "public",
          ))
        );
      }
      case "cloudflare_stream": {
        if (location.playbackUrl) return location.playbackUrl;
        const details = await this.videoStorage.getVideoDetails(
          location.videoId,
        );
        const hls = details?.playback?.hls;
        return typeof hls === "string" ? hls : undefined;
      }
      case "remote":
      case "upload":
        return location.url;
      default:
        return undefined;
    }
  }

  private locationSignature(location: AttachmentLocation): string {
    switch (location.kind) {
      case "cloudflare_image":
        return `cf-image:${location.imageId}:${location.variant ?? "default"}`;
      case "cloudflare_stream":
        return `cf-stream:${location.videoId}`;
      case "r2":
        return `r2:${location.bucket}:${location.key}`;
      case "remote":
        return `remote:${location.platform}:${location.id ?? location.url ?? "unknown"}`;
      case "upload":
        return `upload:${location.url}`;
      default:
        return `unknown:${JSON.stringify(location)}`;
    }
  }
}

function derivePrimaryLocationFromSpec(
  spec: SharedAttachmentSpec,
): AttachmentLocation | null {
  if (spec.s3Key) {
    return {
      kind: "r2",
      key: spec.s3Key,
      bucket: Storage.PUBLIC_BUCKET.name,
      url: spec.publicUrl,
    } satisfies R2Location;
  }

  if (spec.publicUrl) {
    if (spec.publicUrl.includes("imagedelivery.net")) {
      return {
        kind: "cloudflare_image",
        imageId: spec.id,
        variant: "public",
        url: spec.publicUrl,
      } satisfies CloudflareImageLocation;
    }

    if (spec.publicUrl.includes("videodelivery.net")) {
      return {
        kind: "cloudflare_stream",
        videoId: spec.id,
        playbackUrl: spec.publicUrl,
      } satisfies CloudflareStreamLocation;
    }

    return {
      kind: "remote",
      platform: "external",
      url: spec.publicUrl,
    } satisfies RemoteLocation;
  }

  if (spec.presignedUrl) {
    return {
      kind: "upload",
      url: spec.presignedUrl,
    } satisfies UploadLocation;
  }

  return null;
}

function derivePreviewLocation(
  spec: SharedAttachmentSpec,
): AttachmentLocation | undefined {
  const previewUrl =
    spec.thumbnailUrl ?? (spec.type === "video" ? spec.thumbnail : undefined);
  if (!previewUrl) return undefined;
  if (previewUrl.includes("imagedelivery.net")) {
    return {
      kind: "cloudflare_image",
      imageId: spec.id,
      variant: "public",
      url: previewUrl,
    } satisfies CloudflareImageLocation;
  }
  return {
    kind: "remote",
    platform: "external",
    url: previewUrl,
  } satisfies RemoteLocation;
}

function sanitizeMetadata(
  metadata: SharedAttachmentSpec["metadata"],
): AttachmentMetadata | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  return { ...(metadata as AttachmentMetadata) };
}

function collectDimensions(
  spec: SharedAttachmentSpec,
  override?: AttachmentDimensions,
): AttachmentDimensions | undefined {
  const dimensions: AttachmentDimensions = {
    width: "width" in spec ? (spec.width ?? undefined) : undefined,
    height: "height" in spec ? (spec.height ?? undefined) : undefined,
  };

  const hasDimensions =
    dimensions.width !== undefined || dimensions.height !== undefined;

  if (!hasDimensions && !override) return undefined;

  return {
    width: override?.width ?? dimensions.width,
    height: override?.height ?? dimensions.height,
  } satisfies AttachmentDimensions;
}

function collectDuration(
  spec: SharedAttachmentSpec,
  override?: number | null,
): number | null | undefined {
  if (spec.type === "video") {
    return override ?? spec.duration ?? null;
  }
  return override;
}

function inferInitialState(
  location: AttachmentLocation,
): AttachmentLifecycleState {
  switch (location.kind) {
    case "upload":
      return "pending";
    case "remote":
      return "uploaded";
    case "cloudflare_image":
    case "cloudflare_stream":
      return "ready";
    case "r2":
      return "mirrored";
    default:
      return "pending";
  }
}

function fallbackLocation(spec: SharedAttachmentSpec): AttachmentLocation {
  return {
    kind: "remote",
    platform: "unknown",
    id: spec.id,
  } satisfies RemoteLocation;
}
