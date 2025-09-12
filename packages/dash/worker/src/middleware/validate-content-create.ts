import { zValidator as zv } from "@hono/zod-validator";
import { AppError } from "../helpers/error";
import { ContentCreateData } from "../routes/api/workspaces/content";

export const withContentCreateData = () =>
  zv("json", ContentCreateData, (result) => {
    if (!result.success) {
      throw new AppError(400, {
        message: "request validation failed",
        cause: result.error,
      });
    }
    // TODO: validate specs
  });
