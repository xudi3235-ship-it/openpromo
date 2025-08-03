import { z } from "zod";
import { ReadStream } from "fs";
import { API_VERSION } from "./constant";
import { CreateVideoParams, CreateVideoSchema } from "../types";

const FacebookVideoProviderConfig = z.object({
    pageId: z.string(),
    accessToken: z.string(),
});

type FacebookVideoProviderConfig = z.infer<typeof FacebookVideoProviderConfig>;

export namespace FacebookVideoProvider {
    export async function startUploadSession(
        config: FacebookVideoProviderConfig,
        fileSize: number,
    ) {
        const { pageId, accessToken } = config;
        const initResponse = await fetch(
            `https://graph.facebook.com/${API_VERSION}/${pageId}/videos`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    upload_phase: "start",
                    access_token: accessToken,
                    file_size: fileSize,
                }),
            },
        );

        if (!initResponse.ok) {
            const errorData = await initResponse.json();
            throw new Error(`Failed to initialize upload session: ${JSON.stringify(errorData)}`);
        }

        return (await initResponse.json()) as {
            video_id: string;
            upload_session_id: string;
        };
    }

    export async function uploadVideo(
        config: FacebookVideoProviderConfig,
        uploadSessionId: string,
        videoStream: ReadStream,
        fileSize: number,
    ) {
        const { accessToken } = config;
        const uploadResponse = await fetch(
            `https://graph.facebook.com/${API_VERSION}/${uploadSessionId}`,
            {
                method: "POST",
                headers: {
                    Authorization: `OAuth ${accessToken}`,
                    "Content-Type": "application/octet-stream",
                    "Content-Length": fileSize.toString(),
                },
                body: videoStream,
            },
        );

        if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            throw new Error(`Failed to upload video: ${JSON.stringify(errorData)}`);
        }

        return await uploadResponse.json();
    }

    export async function publishVideo(
        config: FacebookVideoProviderConfig,
        videoId: string,
        params: CreateVideoParams,
    ) {
        const { success, data, error } = CreateVideoSchema.safeParse(params);
        if (!success) {
            throw new Error(`Invalid video parameters: ${error}`);
        }

        const { pageId, accessToken } = config;
        const publishResponse = await fetch(
            `https://graph.facebook.com/${API_VERSION}/${pageId}/videos`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...data,
                    video_id: videoId,
                    upload_phase: "finish",
                    access_token: accessToken,
                }),
            },
        );

        if (!publishResponse.ok) {
            const errorData = await publishResponse.json();
            throw new Error(`Failed to publish video: ${JSON.stringify(errorData)}`);
        }

        return publishResponse.json();
    }
}
