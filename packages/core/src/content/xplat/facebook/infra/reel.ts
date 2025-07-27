import { z } from "zod";
import { API_VERSION } from "./constant";

const FacebookReelProviderConfig = z.object({
  pageId: z.string(),
  accessToken: z.string(),
});

const FacebookReelPublishParams = z.object({
  description: z.string().optional(),
  feed_targeting: z.object({}).optional(),
  place: z.string().optional(),
  scheduled_publish_time: z.number().optional(),
  targeting: z.object({}).optional(),
  title: z.string().optional(),
  upload_phase: z.enum(["start", "finish"]),
  video_id: z.string().optional(),
  video_state: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED"]),
});

type FacebookReelPublishParams = z.infer<typeof FacebookReelPublishParams>;

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

  export async function publishReel(
    config: FacebookReelProviderConfig,
    videoId: string,
    params: Omit<FacebookReelPublishParams, "upload_phase" | "video_id">,
  ) {
    const { pageId, accessToken } = config;
    const publishParams = FacebookReelPublishParams.parse({
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
