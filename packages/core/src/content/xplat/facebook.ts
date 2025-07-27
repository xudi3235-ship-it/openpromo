import {
  FacebookAdsApi,
  Page,
  PagePost,
  Photo,
  IGMedia,
  IGUser,
} from "facebook-nodejs-business-sdk";

/**
 * child attachment specs: https://gist.github.com/rachhen/4b8618de872e1388b577421ecfc8fb1a
 */
export default class FacebookContentPublisher {
  private api: FacebookAdsApi;
  private page: Page;

  constructor(private pageId: string, private accessToken: string) {
    this.api = new FacebookAdsApi(accessToken);
    this.api.setDebug(true);
    this.page = new Page(pageId, this.api);
  }

  // https://developers.facebook.com/docs/pages-api/posts
  public async publishToFeed() {
    const fields: string[] = [];
    const params = {
      [PagePost.Fields.message]: "Hello, world!",
      [PagePost.Fields.child_attachments]: [],
      // [PagePost.Fields.call_to_action]: []
    };
    return await this.page.createFeed(fields, params);
  }

  // https://developers.facebook.com/docs/page-stories-api
  public async publishToStory() {
    const fields: string[] = [];
    const params = {
      [PagePost.Fields.message]: "Check out my story!",
      [PagePost.Fields.story]: "My Story",
    };
    // depending on attachments, we have photo & video
    return await this.page.createPhoto(fields, params);
  }
}
