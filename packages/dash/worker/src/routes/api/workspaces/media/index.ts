import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import { imagesRoute } from "./images.js";
import { videosRoute } from "./videos.js";

export const mediaRoute = new Hono<ApiEnv>()
  .route("/images", imagesRoute)
  .route("/videos", videosRoute);
