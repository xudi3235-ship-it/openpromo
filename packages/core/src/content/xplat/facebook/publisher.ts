import { FacebookAdsApi, Page, Photo } from "facebook-nodejs-business-sdk";

import { VideoUploader } from "facebook-nodejs-business-sdk/src/video-uploader";
import {
  CreateFeedParams,
  CreateFeedSchema,
  CreatePhotoParams,
  CreatePhotoSchema,
  CreateVideoParams,
  CreateVideoSchema,
} from "./types";

export class FacebookPageApi {
  private page: Page;
  constructor(api: FacebookAdsApi, private pageId: string) {
    this.page = new Page(pageId, api);
  }

  // low level wrappers
  public async _createFeed(
    fields: string[],
    params: CreateFeedParams,
  ): Promise<Page> {
    const validatedParams = CreateFeedSchema.parse(params);
    return await this.page.createFeed(fields, validatedParams);
  }

  public async _createPhoto(
    fields: string[],
    params: CreatePhotoParams,
  ): Promise<Photo> {
    const validatedParams = CreatePhotoSchema.parse(params);
    return await this.page.createPhoto(fields, validatedParams);
  }

  public async _createVideo(fields: string[], params: CreateVideoParams) {
    const validatedParams = CreateVideoSchema.parse(params);
    return await this.page.createVideo(fields, validatedParams);
  }

  // ----- apis -----
  public async createTextPost(message: string) {
    const params: CreateFeedParams = {
      message,
      published: true, // publish immediately
    };
    return this._createFeed(["id"], params);
  }
  public async createMultiPhotoPost(message: string, img_urls: string[]) {
    const photoIds: string[] = [];
    // 1. create unpublished photos
    for (const url of img_urls) {
      const photo = await this._createPhoto(["id"], {
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
    return await this._createFeed(["id"], params);
  }

  public async createLinkPost(message: string, link: string) {
    const params: CreateFeedParams = {
      message,
      link,
      published: true, // publish immediately
    };
    return this._createFeed(["id"], params);
  }
  public async createVideoPost(
    videoUrl: string,
    title: string,
    description: string,
  ) {
    // FIXME: this is wrong. we need to first
    // upload the video and get a ready videoID
    // then publish
    const params: CreateVideoParams = {
      file_url: videoUrl,
      title,
      description,
      published: true, // publish immediately
    };
    return await this._createVideo(["id"], params);
  }
}
