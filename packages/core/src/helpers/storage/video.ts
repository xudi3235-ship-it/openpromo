import { extractAttachmentMetadata } from "@core/domain/content/attachments/metadata";
import { db, eq } from "@core/helpers/db";
import { getCloudflareClient } from "@core/providers";
import { unifiedContentTable } from "@core/schemas/content.sql";
import { env } from "@core/utils/env";
import type {
  DirectUploadCreateParams,
  DirectUploadCreateResponse,
} from "cloudflare/resources/stream/direct-upload.mjs";
import type {
  StreamListParams,
  Video as StreamVideo,
} from "cloudflare/resources/stream/stream.mjs";
import { Actor } from "../actor";

// using cloudflare stream service.
export namespace VideoStorage {
  export type MediaTransformationOptions = {
    mode?: "video" | "frame" | "spritesheet" | "audio";
    width?: number;
    height?: number;
    fit?: "contain" | "cover" | "scale-down";
    duration?: string;
    time?: string;
    audio?: boolean;
  };

  export function buildTransformationUrl_NOT_READY(
    sourceUrl: string,
    options: MediaTransformationOptions = {},
  ): string | null {
    const base = "TODO: replace this to refer to cloudflare transform doc";
    const params: Record<string, string | number | boolean> = {
      mode: "video",
      audio: true,
      ...options,
    };

    const segments = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${key}=${value}`);

    const opts = segments.join(",");
    const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
    const encodedSource = encodeURIComponent(sourceUrl);
    return `${normalizedBase}/cdn-cgi/media/${opts}/${encodedSource}`;
  }
  // Types for Cloudflare Stream Downloads API
  interface DownloadInfo {
    status: "inprogress" | "ready" | "error";
    url: string;
    percentComplete: number;
  }

  interface DownloadResponse {
    result: {
      default?: DownloadInfo;
      audio?: DownloadInfo;
    };
    success: boolean;
    errors: string[];
    messages: string[];
  }
  /**
   * for basic upload, file size < 200MB.
   */
  export async function createDirectUpload(
    params: Omit<DirectUploadCreateParams, "account_id" | "creator">,
  ): Promise<DirectUploadCreateResponse> {
    const { meta, ...rest } = params;
    const c = getCloudflareClient();
    try {
      const directUpload = await c.stream.directUpload.create({
        creator: Actor.workspaceID(),
        account_id: env.CLOUDFLARE_DEFAULT_ACCOUNT_ID,
        ...rest,
        meta: meta ? JSON.stringify(meta) : undefined,
      });
      return directUpload;
    } catch (error) {
      console.error("Error creating direct upload:", error);
      throw error;
    }
  }
  export type VideoMetadata = Record<string, unknown>;

  async function readExistingMetadata(videoId: string): Promise<VideoMetadata> {
    const c = getCloudflareClient();
    try {
      const video = await c.stream.get(videoId, {
        account_id: env.CLOUDFLARE_DEFAULT_ACCOUNT_ID,
      });
      const meta = video.meta;
      if (!meta) return {};
      if (typeof meta === "object") return meta as VideoMetadata;
      if (typeof meta === "string") {
        try {
          return JSON.parse(meta) as VideoMetadata;
        } catch (error) {
          console.warn("failed to parse video metadata string", {
            videoId,
            error,
          });
        }
      }
      return {};
    } catch (error) {
      console.error("failed to fetch video metadata", { videoId, error });
      return {};
    }
  }

  export async function setMetadata(
    videoId: string,
    metadata: VideoMetadata,
    options: { replace?: boolean } = {},
  ): Promise<void> {
    const c = getCloudflareClient();
    const { replace = false } = options;
    const base = replace ? {} : await readExistingMetadata(videoId);
    const nextMetadata = { ...base, ...metadata } satisfies VideoMetadata;
    await c.stream.edit(videoId, {
      account_id: env.CLOUDFLARE_DEFAULT_ACCOUNT_ID,
      meta: nextMetadata,
    });
  }

  export async function getVideoDetails(
    videoId: string,
  ): Promise<StreamVideo | null> {
    const c = getCloudflareClient();
    try {
      const video = await c.stream.get(videoId, {
        account_id: env.CLOUDFLARE_DEFAULT_ACCOUNT_ID,
      });
      return video as StreamVideo;
    } catch (error) {
      console.error("failed to fetch video details", { videoId, error });
      return null;
    }
  }

  /**
   * resumable upload for large files. This reads in request from web server
   * and reads the headers. Use this with TUS client, e.g. uppy.
   *
   * reference: https://developers.cloudflare.com/stream/uploading-videos/direct-creator-uploads/#resumable-uploads
   *
   */
  export async function createResumableUpload(request: Request) {
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_DEFAULT_ACCOUNT_ID}/stream?direct_user=true`;

    const uploadLength = request.headers.get("Upload-Length");
    const uploadMetadata = request.headers.get("Upload-Metadata");
    if (!uploadLength || !uploadMetadata) {
      throw new Error(
        "Missing required TUS headers: Upload-Length or Upload-Metadata",
      );
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `bearer ${env.CLOUDFLARE_API_TOKEN}`,
        "Tus-Resumable": "1.0.0",
        "Upload-Length": uploadLength,
        "Upload-Metadata": uploadMetadata,
      },
    });

    const destination = response.headers.get("Location") as string;

    return new Response(null, {
      headers: {
        "Access-Control-Expose-Headers": "Location",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Origin": "*",
        Location: destination,
      },
    });
  }
  /**
   * Creates a downloadable MP4 file for a video.
   */
  export async function createMP4Download(
    videoId: string,
  ): Promise<DownloadResponse["result"]> {
    const c = getCloudflareClient();
    const res = await c.stream.downloads.create(videoId, {
      account_id: env.CLOUDFLARE_DEFAULT_ACCOUNT_ID,
      body: {},
    });
    console.log({ res });

    return res as DownloadResponse["result"];
  }

  export async function deleteVideo(videoId: string): Promise<void> {
    const c = getCloudflareClient();
    await c.stream.delete(videoId, {
      account_id: env.CLOUDFLARE_DEFAULT_ACCOUNT_ID,
    });
  }

  export async function batchDeleteVideos(): Promise<void> {
    await iterateVideos(async (video) => {
      if (!video.uid) return;
      const safe = await isVideoSafeToDelete(video);
      if (!safe) return;
      await deleteVideo(video.uid);
    });
  }

  /**
   * Creates a downloadable M4A audio file for a video.
   */
  export async function createM4ADownload(
    videoId: string,
  ): Promise<DownloadResponse> {
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_DEFAULT_ACCOUNT_ID}/stream/${videoId}/downloads/audio`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to create M4A download: ${response.statusText}`);
    }

    return response.json() as Promise<DownloadResponse>;
  }

  /**
   * Gets all available download links for a video.
   */
  export async function getDownloadLinks(
    videoId: string,
  ): Promise<DownloadResponse> {
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_DEFAULT_ACCOUNT_ID}/stream/${videoId}/downloads`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get download links: ${response.statusText}`);
    }

    return response.json() as Promise<DownloadResponse>;
  }

  /**
   * Downloads a video file directly using the download URL.
   * @param downloadUrl - The download URL from the downloads API response
   * @param filename - Optional custom filename for the download
   */
  export async function downloadFile(downloadUrl: string, filename?: string) {
    const url = filename
      ? `${downloadUrl}?filename=${encodeURIComponent(filename)}`
      : downloadUrl;

    const response = await fetch(url, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    return response;
  }

  export async function pollDownloadStatus(
    videoId: string,
    downloadType: "default" | "audio" = "default",
    maxAttempts: number = 30,
    intervalMs: number = 2000,
  ): Promise<DownloadInfo> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const downloads = await getDownloadLinks(videoId);

      if (downloads.success && downloads.result[downloadType]) {
        const download = downloads.result[downloadType];

        if (download.status === "ready") {
          return download;
        }

        if (download.status === "error") {
          throw new Error(`Download processing failed for ${downloadType}`);
        }
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error(
      `Video ${videoId} Download not ready after ${maxAttempts} attempts`,
    );
  }

  async function iterateVideos(
    handler: (video: StreamVideo) => Promise<void>,
    params: Partial<Omit<StreamListParams, "account_id">> = {},
  ): Promise<void> {
    const c = getCloudflareClient();
    const requestParams = {
      account_id: env.CLOUDFLARE_DEFAULT_ACCOUNT_ID,
      ...params,
    } as StreamListParams;

    const iterator = c.stream.list(requestParams);

    for await (const video of iterator) {
      await handler(video);
    }
  }

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  async function isVideoSafeToDelete(video: StreamVideo): Promise<boolean> {
    const videoId = video.uid;
    if (!videoId) return false;

    const uploadedAt = video.uploaded ? new Date(video.uploaded) : null;

    let opMeta = extractAttachmentMetadata(video.meta);

    if (Object.keys(opMeta).length === 0) {
      const storedMeta = await readExistingMetadata(videoId);
      opMeta = extractAttachmentMetadata(storedMeta);
    }

    const contentId = opMeta.opContentId ?? null;
    const statusFromMeta = opMeta.opStatus ?? null;

    if (!contentId) {
      if (!uploadedAt) return false;
      return Date.now() - uploadedAt.getTime() > ONE_DAY_MS;
    }

    const [content] = await db()
      .select({ publishingStatus: unifiedContentTable.publishingStatus })
      .from(unifiedContentTable)
      .where(eq(unifiedContentTable.id, contentId))
      .limit(1);

    if (!content) {
      return (
        statusFromMeta === "PUBLISHED" ||
        (uploadedAt ? Date.now() - uploadedAt.getTime() > ONE_DAY_MS : true)
      );
    }

    if (content.publishingStatus === "PUBLISHED") {
      return true;
    }

    if (statusFromMeta === "PUBLISHED") {
      return true;
    }

    return false;
  }
}
