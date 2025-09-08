import type { ApiEnv } from "@openpromo/core/helpers/api-env";
import { hmacSha256Verify } from "@openpromo/core/utils/crypto";
import type { Context } from "hono";
import type { MiddlewareHandler } from "hono/types";
import { AppError } from "../helpers/error";

export const verifyMetaWebhookSignature =
  (secret: string): MiddlewareHandler =>
  async (c: Context<ApiEnv>, next) => {
    const signature = c.req
      .header("X-Hub-Signature-256")
      ?.replace("sha256=", "");
    if (!signature) {
      throw new AppError(403, {
        message: "Missing X-Hub-Signature-256 header",
      });
    }
    const valid = await hmacSha256Verify(
      secret,
      await c.req.raw.bytes(),
      signature,
    );
    if (!valid) {
      throw new AppError(403, {
        message: "Invalid X-Hub-Signature-256 header",
      });
    }
    return next();
  };
