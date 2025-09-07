import { zValidator as zv } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import type { ZodObject } from "zod";
import { AppError } from "../helpers/error";

// Wrapper around zValidator to throw AppError instead of returning HTTP Response
export const zValidator = <
  T extends ZodObject,
  Target extends keyof ValidationTargets,
>(
  target: Target,
  schema: T,
) =>
  zv(target, schema, (result) => {
    if (!result.success) {
      throw new AppError(400, {
        message: "request validation failed",
        cause: result.error,
      });
    }
  });
