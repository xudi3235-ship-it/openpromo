import { db, eq } from "@core/helpers/db";
import { getCloudflareClient } from "@core/providers";
import { unifiedContentTable } from "@core/schemas/content.sql";
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
  export type ImageMetadata = Record<string, unknown>;

  async function readExistingMetadata(imageId: string): Promise<ImageMetadata> {
    try {
      const image = await get(imageId);
      const { meta } = image;
      if (!meta) return {};
      if (typeof meta === "object") return meta as ImageMetadata;
      if (typeof meta === "string") {
        try {
          return JSON.parse(meta) as ImageMetadata;
        } catch (error) {
          console.warn("failed to parse image metadata string", {
            imageId,
            error,
          });
        }
      }
      return {};
    } catch (error) {
      console.error("failed to fetch image metadata", { imageId, error });
      return {};
    }
  }

  export async function setMetadata(
    imageId: string,
    metadata: ImageMetadata,
    options: { replace?: boolean } = {},
  ): Promise<Image> {
    const c = getCloudflareClient();
    const { replace = false } = options;
    const baseMetadata = replace ? {} : await readExistingMetadata(imageId);
    const nextMetadata = {
      ...baseMetadata,
      ...metadata,
    } satisfies ImageMetadata;

    return await c.images.v1.edit(imageId, {
      account_id: env.CLOUDFLARE_DEFAULT_ACCOUNT_ID,
      metadata: JSON.stringify(nextMetadata),
    });
  }
  export async function deleteImagesPerWorkspace(
    workspaceID: string,
  ): Promise<void> {
    await iterateImages({ creator: workspaceID }, async (img) => {
      if (!img.id) return;
      const safe = await isImageSafeToDelete(img.id);
      if (!safe) return;
      await deleteImage(img.id);
    });
  }
  export async function batchDeleteImages(): Promise<void> {
    await iterateImages({}, async (img) => {
      if (!img.id) return;
      const safe = await isImageSafeToDelete(img.id);
      if (!safe) return;
      await deleteImage(img.id);
    });
  }
  // ------------ internal ------------ //
  async function iterateImages(
    params: Partial<ListParams>,
    handler: (img: Image) => Promise<void>,
    options: { perPage?: number } = {},
  ): Promise<void> {
    const perPage = options.perPage ?? 50;
    let nextToken: string | null | undefined;

    while (true) {
      const { images, continuation_token } = await list({
        ...params,
        per_page: perPage,
        continuation_token: nextToken,
      });

      if (!images || images.length === 0) {
        break;
      }

      for (const img of images) {
        await handler(img);
      }

      if (!continuation_token) {
        break;
      }
      nextToken = continuation_token;
    }
  }
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  async function isImageSafeToDelete(imageId: string): Promise<boolean> {
    const image = await get(imageId);

    const uploadedAt = image.uploaded ? new Date(image.uploaded) : null;

    if (!image.creator) {
      if (!uploadedAt) return true;
      return Date.now() - uploadedAt.getTime() > ONE_DAY_MS;
    }

    const meta = await readExistingMetadata(imageId);
    const contentId =
      typeof meta.opContentId === "string" ? meta.opContentId : null;
    const statusFromMeta =
      typeof meta.opStatus === "string" ? meta.opStatus : null;

    if (statusFromMeta === "PUBLISHED") {
      return true;
    }

    if (!contentId) {
      return false;
    }

    const [content] = await db()
      .select({ publishingStatus: unifiedContentTable.publishingStatus })
      .from(unifiedContentTable)
      .where(eq(unifiedContentTable.id, contentId))
      .limit(1);

    if (!content) {
      return true;
    }

    return content.publishingStatus === "PUBLISHED";
  }
}
