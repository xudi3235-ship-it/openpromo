import { FacebookAdsApi, Page } from "facebook-nodejs-business-sdk";

export namespace FacebookMutation {
  export const setupWebhook = async (pageId: string, accessToken: string) => {
    const api = initApi(accessToken);
    const page = new Page(pageId, api);
    await page.createSubscribedApp([], {
      subscribed_fields: ["feed", "messages"],
    });
  };
  export const teardownWebhook = async (
    pageId: string,
    accessToken: string,
  ): Promise<void> => {
    const api = initApi(accessToken);
    const page = new Page(pageId, api);
    await page.deleteSubscribedApps();
  };
  const initApi = async (accessToken: string) => {
    return FacebookAdsApi.init(accessToken).setDebug(true);
  };
}
