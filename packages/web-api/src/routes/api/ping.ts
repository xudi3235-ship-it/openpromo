import { Hono } from "hono";
import { ping } from "../../generated/api/sdk.gen";
import { createLiquidClient } from "../../helpers/rpc";
import type { ApiEnv } from "../../types";

export const pingRoute = new Hono<ApiEnv>().get("/", async (c) => {
  const conn = c.env.HYPERDRIVE.connectionString;
  let message = conn ? "pong from worker" : "no connection";
  // we probably don't need this once we have openapi specs updated
  const client = createLiquidClient();
  try {
    const res = await ping({ client });
    if (!res.error) {
      message += " and modal!";
    } else {
      message = " failed for modal";
    }
  } catch (error) {
    console.error("Error occurred while pinging:", error);
  }
  return c.json({ message });
});
