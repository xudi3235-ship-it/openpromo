import { FacebookAdsApi, Page } from "facebook-nodejs-business-sdk";
import { ConnectedAccount } from "@/domain/connected-account/connected-account";
import { EntPendingContent } from ".";

export namespace FacebookMutation {
  export const createTextPost = async (pendingContentID: string) => {
    const content = await EntPendingContent.fromID(pendingContentID);
    const spec = content.facebookFeedPlacementSpec();
    const text = spec.postSpec.message;
    const { pageId } = spec.identity;
    // 0. ensure identity is connected and valid
    const acc = await ConnectedAccount.fromFBPageID(pageId);
    // 1. get page
    if (!text) throw new Error("no text provided");
    const api = initApi(acc.encryptedAccessToken);
    // 2. create post using sdk.
    // probably fetch is easier TBH
    const page = new Page(pageId, api);
    const post = await page.createFeed([], {
      message: text,
    });
    console.log("created post", post);
  };

  export const api = async (
    path: string,
    accessToken: string,
    fields: string[],
  ) => {
    const r = await fetch(
      `https://graph.facebook.com/v23.0/${path}?access_token=${accessToken}&fields=${fields.join(",")}`,
      {
        method: "POST",
      },
    );
    return await r.json();
  };
  const initApi = async (accessToken: string) => {
    return FacebookAdsApi.init(accessToken).setDebug(true);
  };
}
