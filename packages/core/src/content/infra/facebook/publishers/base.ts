import {
  AdVideo,
  FacebookAdsApi,
  Page,
  Photo,
} from "facebook-nodejs-business-sdk";

import { VideoUploader } from "facebook-nodejs-business-sdk/src/video-uploader";
import {
  CreateFeedParams,
  CreateFeedSchema,
  CreatePhotoParams,
  CreatePhotoSchema,
  CreateVideoParams,
  CreateVideoSchema,
} from "../types";
import { FacebookReelProvider } from "../media/reel";
import { IdentityService } from "../identity";

export abstract class BaseFacebookPublisher {
  protected page: Page;
  protected api: FacebookAdsApi;

  constructor(identity: IdentityService) {
    this.api = identity.getApi();
    this.page = new Page(identity.getPageId(), this.api);
  }
  // -------- low level apis -------
  protected async createFeed(
    fields: string[],
    params: CreateFeedParams,
  ): Promise<Page> {
    const {
      success,
      data: validatedParams,
      error,
    } = CreateFeedSchema.safeParse(params);
    if (!success) throw new Error(`Invalid feed params: ${error.message}`);
    return await this.page.createFeed(fields, validatedParams);
  }

  protected async createPhoto(
    fields: string[],
    params: CreatePhotoParams,
  ): Promise<Photo> {
    const {
      success,
      data: validatedParams,
      error,
    } = CreatePhotoSchema.safeParse(params);
    if (!success) throw new Error(`Invalid photo params: ${error.message}`);
    return await this.page.createPhoto(fields, validatedParams);
  }

  /**
   * This creates a video on the page. NOTE it's not a reel.
   * @param fields
   * @param params
   * @returns
   */
  protected async createVideo(
    fields: string[],
    params: CreateVideoParams,
  ): Promise<AdVideo> {
    const {
      success,
      data: validatedParams,
      error,
    } = CreateVideoSchema.safeParse(params);
    if (!success) throw new Error(`Invalid video params: ${error.message}`);
    return await this.page.createVideo(fields, validatedParams);
  }

  // ----- apis -----

  public async createVideoReel(
    videoUrl: string,
    title: string,
    description: string,
  ) {
    const config = {
      pageId: this.page.id,
      accessToken: this.api.accessToken,
    };
    const { video_id, upload_url } =
      await FacebookReelProvider.startUploadSession(config);
    await FacebookReelProvider.uploadVideo(config, upload_url, videoUrl);
    return await FacebookReelProvider.publishReel(config, video_id, {
      video_state: "PUBLISHED",
      title,
      description,
    });
  }
}
