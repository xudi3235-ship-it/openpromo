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
    // find first ig, just for test
    const ig = accounts.find((acc) => acc.platform === "INSTAGRAM");

    const instance = await c.env.ContentBackfillWorkflow.create({
      params: {
        actor,
        connectedAccountID: ig?.id || "",
        start: new Date(
          new Date().setMonth(new Date().getMonth() - 3),
        ).toISOString(),
        end: new Date().toISOString(),
      },
    });

    return c.json({
      success: true,
      id: instance.id,
      status: await instance.status(),
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
