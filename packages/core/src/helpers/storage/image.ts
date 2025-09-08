import { getCloudflareClient } from "@core/providers";
import { env } from "@core/utils/env";
import type {
  DirectUploadCreateParams,
  DirectUploadCreateResponse,
} from "cloudflare/resources/images/v2/direct-uploads.mjs";
import type {
  V2ListParams,
  V2ListResponse,
} from "cloudflare/resources/images/v2/v2.mjs";

// wraps the Cloudflare Images API
// https://developers.cloudflare.com/images/
export namespace ImageStorage {
  /**
   * V2 apis.
   * https://developers.cloudflare.com/api/node/resources/images/subresources/v2/subresources/direct_uploads/
   */
  export async function createDirectUpload(
    params: Omit<DirectUploadCreateParams, "account_id">,
  ): Promise<DirectUploadCreateResponse> {
    const c = getCloudflareClient();
    const upload = await c.images.v2.directUploads.create({
      account_id: env.CLOUDFLARE_DEFAULT_ACCOUNT_ID,
      ...params,
    });
    return upload;
  }
  export async function list(
    params: Omit<V2ListParams, "account_id">,
  ): Promise<V2ListResponse> {
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
}
