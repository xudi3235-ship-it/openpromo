import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import { getImageDeliveryUrlRoute } from "./routes/get-image-delivery-url";
import { getImageUploadUrlRoute } from "./routes/get-image-upload-url";

export const imagesRoute = new Hono<ApiEnv>()
  .route("/", getImageUploadUrlRoute)
  .route("/", getImageDeliveryUrlRoute);
