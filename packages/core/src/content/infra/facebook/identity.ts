import { FacebookAdsApi } from "facebook-nodejs-business-sdk";
import { unifiedContentTable } from "../../content.sql";
import { Actor } from "../../../actor";
import { createTransaction } from "../../../drizzle/transaction";
import { NotImplementedError } from "../../../error";
import { eq, and } from "drizzle-orm";
import {
    assertMetadata,
    connectedAccount,
    ConnectedAccountMetadata,
} from "../../../connected_account/connected_account.sql";

/**
 * core identity service used for FB & IG infra
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
    public static fromPageId(pageId: string, accessToken: string): IdentityService {
        return new IdentityService(accessToken, pageId);
    }
    public static async fromUnifiedContent(
        c: typeof unifiedContentTable.$inferSelect,
    ): Promise<IdentityService> {
        if (!c.placement.startsWith("FB")) throw new Error("Invalid placement");
        const actor = Actor.assert("user");
        const workspaceID = actor.properties.workspaceID;
        return await createTransaction(async (tx) => {
            return await tx
                .select()
                .from(connectedAccount)
                .where(
                    and(
                        eq(connectedAccount.workspaceID, workspaceID),
                        eq(connectedAccount.platform, "FACEBOOK"),
                        eq(connectedAccount.status, "ACTIVE"),
                        eq(connectedAccount.id, c.connectedAccountId),
                    ),
                )
                .then((rows) => {
                    if (rows.length === 0)
                        throw new Error("No active connected account found for Facebook");
                    const acc = rows[0];
                    const meta = assertMetadata("FACEBOOK", acc.metadata);
                    return new IdentityService(
                        acc.encryptedAccessToken,
                        meta.pageId!,
                        meta.adAccountId,
                    );
                });
        });
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
