import { ConnectedAccount } from "@core/domain/connected-account";
import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";

/**
 * Test backfill request schema
 * Allows testing content backfill workflow with provided parameters
 */

export const testBackfillRoute = new Hono<ApiEnv>().get("/", async (c) => {
  console.log("// Received test backfill request");
  // Test endpoint for content backfill workflow
  try {
    const actor = Actor.assert("workspace_user");
    const accounts = await ConnectedAccount.list();
    // filter to only FB
    const filteredAccounts = accounts.filter(
      (acc) => acc.platform === "FACEBOOK",
    );

    const params = filteredAccounts.map((account) => ({
      params: {
        actor,
        connectedAccountID: account.id,
        start: new Date(
          new Date().setDate(new Date().getDate() - 30),
        ).toISOString(),
        end: new Date().toISOString(),
      },
    })) satisfies Array<
      Parameters<typeof c.env.ContentBackfillWorkflow.create>[0]
    >;
    // backfill all the accounts
    await c.env.ContentBackfillWorkflow.createBatch(params);

    return c.json({
      success: true,
      message: "Content backfill workflow started for testing",
    });
  } catch (error) {
    return c.json(
      {
        error: "Failed to start content backfill workflow",
        details: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});
