import { FacebookAdsApi } from "facebook-nodejs-business-sdk";
import { unifiedContentTable } from "../../content.sql";
import { Actor } from "../../../actor";
import { createTransaction } from "../../../drizzle/transaction";
import { NotImplementedError } from "../../../error";

/**
 * core identity service used for FB & IG
 * infra
 */
export class IdentityService {
  private api: FacebookAdsApi;
  private pageId: string;
  private adAccountId?: string;

  constructor(accessToken: string, pageId: string, adAccountId?: string) {
    this.api = new FacebookAdsApi(accessToken);
    this.pageId = pageId;
    this.adAccountId = adAccountId;
  }
  public static fromPageId(
    pageId: string,
    accessToken: string,
  ): IdentityService {
    return new IdentityService(accessToken, pageId);
  }
  public static fromUnifiedContent(
    c: typeof unifiedContentTable.$inferSelect,
  ): IdentityService {
    if (!c.placement.startsWith("FB")) throw new Error("Invalid placement");
    // the content --> maps to the connected account, which stores the access token
    //
    const actor = Actor.assert("user");
    createTransaction(async (tx) => {
      // await tx.select().from(connectedA)
    });

    throw new NotImplementedError();
  }
  public getPageId(): string {
    return this.pageId;
  }
  public getAdAccountId(): string | undefined {
    return this.adAccountId;
  }
  public getApi(): FacebookAdsApi {
    return this.api;
  }
}
