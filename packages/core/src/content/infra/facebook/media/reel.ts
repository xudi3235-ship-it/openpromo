import { z } from "zod";
import { CreateFBReelSchema } from "../types";
import { API_VERSION } from "./constant";

const FacebookReelProviderConfig = z.object({
  pageId: z.string(),
  accessToken: z.string(),
});

type CreateFBReelParams = z.infer<typeof CreateFBReelSchema>;
type FacebookReelProviderConfig = z.infer<typeof FacebookReelProviderConfig>;

export namespace FacebookReelProvider {
  export async function startUploadSession(config: FacebookReelProviderConfig) {
    const { pageId, accessToken } = config;
    const initResponse = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${pageId}/video_reels`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          upload_phase: "start",
          access_token: accessToken,
        }),
      },
    );

    if (!initResponse.ok) {
      const errorData = await initResponse.json();
      throw new Error(
        `Failed to initialize upload session: ${JSON.stringify(errorData)}`,
      );
    }

    return (await initResponse.json()) as {
      video_id: string;
      upload_url: string;
    };
  }

  export async function uploadVideo(
    config: FacebookReelProviderConfig,
    uploadUrl: string,
    videoUrl: string,
  ) {
    const { accessToken } = config;
    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `OAuth ${accessToken}`,
        file_url: videoUrl,
      },
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      throw new Error(`Failed to upload video: ${JSON.stringify(errorData)}`);
    }

    return await uploadResponse.json();
  }

  const ProcessingPhaseSchema = z.object({
    error: z
      .object({
        message: z.string(),
      })
      .optional(),
    status: z.enum(["completed", "error", "not_started", "in_progress"]),
  });

  const PublishingPhaseSchema = z.object({
    error: z
      .object({
        message: z.string(),
      })
      .optional(),
    status: z.enum(["completed", "error", "not_started", "in_progress"]),
    publish_status: z
      .enum(["draft", "error", "published", "scheduled"])
      .optional(),
    publish_time: z.number().optional(),
  });

  const UploadingPhaseSchema = z.object({
    bytes_transfered: z.number().optional(),
    errors: z.any().optional(),
    status: z.enum(["completed", "error", "not_started", "in_progress"]),
    source_file_size: z.number().optional(),
  });

  export const VideoStatusSchema = z.object({
    processing_phase: ProcessingPhaseSchema.optional(),
    publishing_phase: PublishingPhaseSchema.optional(),
    uploading_phase: UploadingPhaseSchema.optional(),
    video_status: z.enum([
      "error",
      "expired",
      "processing",
      "ready",
      "uploading",
      "upload_failed",
      "upload_complete",
    ]),
  });
  export async function getUploadStatus(
    config: FacebookReelProviderConfig,
    videoId: string,
  ) {
    const { pageId, accessToken } = config;
    const statusResponse = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${pageId}/${videoId}?fields=status`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!statusResponse.ok) {
      const errorData = await statusResponse.json();
      throw new Error(
        `Failed to get upload status: ${JSON.stringify(errorData)}`,
      );
    }

    const { data: videoStatus, error } = VideoStatusSchema.safeParse(
      await statusResponse.json(),
    );
    if (error) {
      throw new Error(`Invalid video status response: ${error}`);
    }
    return {
      videoStatus,
      isReady: videoStatus.video_status === "ready",
    };
  }

  export async function publishReel(
    config: FacebookReelProviderConfig,
    videoId: string,
    params: Omit<CreateFBReelParams, "upload_phase" | "video_id">,
  ) {
    const { pageId, accessToken } = config;
    const publishParams = CreateFBReelSchema.parse({
      ...params,
      upload_phase: "finish",
      video_id: videoId,
    });

    const searchParams = new URLSearchParams({
      ...Object.fromEntries(
        Object.entries(publishParams).map(([key, value]) => [
          key,
          String(value),
        ]),
      ),
      access_token: accessToken,
    });

    const publishUrl = `https://graph.facebook.com/${API_VERSION}/${pageId}/video_reels?${searchParams.toString()}`;

    const publishResponse = await fetch(publishUrl, {
      method: "POST",
    });

    if (!publishResponse.ok) {
      const errorData = await publishResponse.json();
      throw new Error(`Failed to publish reel: ${JSON.stringify(errorData)}`);
    }

    return await publishResponse.json();
  }
}
