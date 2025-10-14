import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import { getVideoUploadUrlRoute } from "./routes/get-video-upload-url";

export const videosRoute = new Hono<ApiEnv>().route(
  "/",
  getVideoUploadUrlRoute,
);
