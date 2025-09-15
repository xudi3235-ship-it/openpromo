import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import { describeRoute, resolver } from "hono-openapi";
import z from "zod";
import { withAuth } from "../../../middleware/with-auth";

const pingResponseSchema = z.object({
  message: z.string(),
});

export const pingRoute = new Hono<ApiEnv>().use(withAuth()).get(
  "/",
  describeRoute({
    description: "Say hello to the user",
    responses: {
      200: {
        description: "Successful response",
        content: {
          "application/json": { schema: resolver(pingResponseSchema) },
        },
      },
    },
  }),
  async (c) => {
    return c.json({ message: "pong" });
  },
);
