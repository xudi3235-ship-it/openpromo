import { getCloudflareClient } from "@core/providers";
import { env } from "@core/utils/env";
import type {
  DirectUploadCreateParams,
  DirectUploadCreateResponse,
} from "cloudflare/resources/stream/direct-upload.mjs";
import { Actor } from "../actor";

// using cloudflare stream service.
export namespace VideoStorage {
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
    params: Omit<DirectUploadCreateParams, "account_id">,
  ): Promise<DirectUploadCreateResponse> {
    const { meta, ...rest } = params;
    const c = getCloudflareClient();
    const directUpload = await c.stream.directUpload.create({
      account_id: env.CLOUDFLARE_DEFAULT_ACCOUNT_ID,
      ...rest,
      meta: {
        ...(meta ?? {}),
        actor: Actor.assert("workspace_user"),
      },
    });
    return directUpload;
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
}
