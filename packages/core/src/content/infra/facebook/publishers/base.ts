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

export class BaseFacebookPublisher {
  protected page: Page;
  protected api: FacebookAdsApi;

  constructor(pageId: string, api: FacebookAdsApi) {
    this.api = api;
    this.page = new Page(pageId, this.api);
  }
  // -------- low level apis -------
  protected async createFeed(
    fields: string[],
    params: CreateFeedParams,
  ): Promise<Page> {
    const validatedParams = CreateFeedSchema.parse(params);
    return await this.page.createFeed(fields, validatedParams);
  }

  protected async createPhoto(
    fields: string[],
    params: CreatePhotoParams,
  ): Promise<Photo> {
    const validatedParams = CreatePhotoSchema.parse(params);
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
    const validatedParams = CreateVideoSchema.parse(params);
    return await this.page.createVideo(fields, validatedParams);
  }

  // ----- apis -----

  public async createMultiPhotoPost(message: string, img_urls: string[]) {
    const photoIds: string[] = [];
    // 1. create unpublished photos
    for (const url of img_urls) {
      const photo = await this.createPhoto(["id"], {
        url,
        published: false, // unpublished photo
      });
      photoIds.push(photo.id);
    }
    const attachedMedia = photoIds.map((id) => ({
      media_fbid: id,
    }));
    // 2. create feed post w/ attached media
    const params: CreateFeedParams = {
      message,
      attached_media: attachedMedia,
      published: true,
    };
    return await this.createFeed(["id"], params);
  }

  public async createLinkPost(message: string, link: string) {
    const params: CreateFeedParams = {
      message,
      link,
      published: true, // publish immediately
    };
    return this.createFeed(["id"], params);
  }
  public async createVideoPost(
    videoUrl: string,
    title: string,
    description: string,
  ) {
    // seems like we don't need to upload, FB just curls the video
    // and handles it
    const params: CreateVideoParams = {
      file_url: videoUrl,
      title,
      description,
      published: true, // publish immediately
    };
    const adVideo = await this.createVideo(["id"], params);
  }
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
