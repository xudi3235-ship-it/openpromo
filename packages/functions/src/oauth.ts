import { Hono } from "hono";
import { z } from "zod";
import { ConnectedAccount } from "@openpromo/core/connected_account/connected_account";
import { authRequired, validator } from "./common";

export namespace OAuth {
    export const route = new Hono()
        // Get Facebook OAuth URL
        .get(
            "/facebook/url",
            authRequired,
            validator(
                "query",
                z.object({
                    redirect_uri: z.string(),
                    state: z.string().optional(),
                }),
            ),
            async (c) => {
                const { redirect_uri, state } = c.req.valid("query");

                const oauthUrl = await ConnectedAccount.getFacebookOAuthUrl({
                    redirectUri: redirect_uri,
                    state,
                });

                return c.json({ url: oauthUrl });
            },
        )

        // Handle Facebook OAuth callback
        .post(
            "/facebook/callback",
            authRequired,
            validator(
                "json",
                z.object({
                    code: z.string(),
                    state: z.string().optional(),
                }),
            ),
            async (c) => {
                const { code, state } = c.req.valid("json");

                const result = await ConnectedAccount.connectFacebook({
                    code,
                    state,
                });

                return c.json(result);
            },
        )

        // List connected accounts
        .get("/accounts", authRequired, async (c) => {
            const accounts = await ConnectedAccount.list({});
            return c.json(accounts);
        })

        // Get connected account by ID
        .get(
            "/accounts/:id",
            authRequired,
            validator(
                "param",
                z.object({
                    id: z.string(),
                }),
            ),
            async (c) => {
                const { id } = c.req.valid("param");
                const account = await ConnectedAccount.get({ id });
                return c.json(account);
            },
        )

        // Remove connected account
        .delete(
            "/accounts/:id",
            authRequired,
            validator(
                "param",
                z.object({
                    id: z.string(),
                }),
            ),
            async (c) => {
                const { id } = c.req.valid("param");
                await ConnectedAccount.remove({ id });
                return c.json({ success: true });
            },
        );
}
