import { getCloudflareClient } from "@core/providers";
import { env } from "@core/utils/env";
import type {
  Image,
  V1EditParams,
} from "cloudflare/resources/images/v1/v1.mjs";
import type {
  DirectUploadCreateParams,
  DirectUploadCreateResponse,
} from "cloudflare/resources/images/v2/direct-uploads.mjs";
import type {
  V2ListParams,
  V2ListResponse,
} from "cloudflare/resources/images/v2/v2.mjs";
import { Actor } from "../actor";

// wraps the Cloudflare Images API
// https://developers.cloudflare.com/images/
export namespace ImageStorage {
  /**
   * V2 apis.
   * https://developers.cloudflare.com/api/node/resources/images/subresources/v2/subresources/direct_uploads/
   */
  export type DirectUploadParams = Omit<DirectUploadCreateParams, "account_id">;
  export async function createDirectUpload(
    params: DirectUploadParams,
  ): Promise<DirectUploadCreateResponse> {
    const c = getCloudflareClient();
    const { metadata, ...rest } = params;
    const upload = await c.images.v2.directUploads.create({
      creator: Actor.workspaceID(), // assets are owned by workspace
      account_id: env.CLOUDFLARE_DEFAULT_ACCOUNT_ID,
      ...rest,
      metadata: JSON.stringify({
        ...(metadata ?? {}),
      }),
    });
    return upload;
  }
  export type ListParams = Omit<V2ListParams, "account_id">;
  export async function list(params: ListParams): Promise<V2ListResponse> {
    const c = getCloudflareClient();
    const images = await c.images.v2.list({
      account_id: env.CLOUDFLARE_DEFAULT_ACCOUNT_ID,
      ...params,
    });
    return images;
  }

  /**
   * serving uploaded img
   * https://developers.cloudflare.com/images/manage-images/serve-images/serve-uploaded-images/
   */
  export async function getImageDeliveryUrl(
    id: string,
    variantName: string = "public",
  ) {
    return `https://imagedelivery.net/${env.CLOUDFLARE_IMAGE_ACCOUNT_HASH}/${id}/${variantName}`;
  }

  export async function deleteImage(imageId: string): Promise<void> {
    const c = getCloudflareClient();
    await c.images.v1.delete(imageId, {
      account_id: env.CLOUDFLARE_DEFAULT_ACCOUNT_ID,
    });
  }

  export type EditImageParams = Partial<
    Omit<V1EditParams, "account_id" | "requireSignedURLs">
  >;
  export async function edit(
    imageId: string,
    params: EditImageParams,
  ): Promise<Image> {
    const c = getCloudflareClient();
    const { metadata, ...rest } = params;
    return await c.images.v1.edit(imageId, {
      account_id: env.CLOUDFLARE_DEFAULT_ACCOUNT_ID,
      ...rest,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    });
  }
  export async function get(imageId: string): Promise<Image> {
    const c = getCloudflareClient();
    return await c.images.v1.get(imageId, {
      account_id: env.CLOUDFLARE_DEFAULT_ACCOUNT_ID,
    });
  }
  export async function markImageAfterPublish(
    imageId: string,
    contentId: string,
  ): Promise<Image> {
    const c = getCloudflareClient();
    const img = await c.images.v1.edit(imageId, {
      account_id: env.CLOUDFLARE_DEFAULT_ACCOUNT_ID,
      metadata: JSON.stringify({
        ...(await (async () => {
          try {
            const existing = await get(imageId);
            if (existing.meta) {
              if (typeof existing.meta === "object") {
                return existing.meta;
              } else if (typeof existing.meta === "string") {
                // try parse
                return JSON.parse(existing.meta as string);
              } else {
                console.warn("unknown meta type", typeof existing.meta);
              }
            }
          } catch (e) {
            console.error("failed to get existing image meta", e);
          }
          return {};
        })()),
        publishedContentID: contentId,
        publishedAt: new Date().toISOString(),
      }),
    });
    return img;
  }
}
