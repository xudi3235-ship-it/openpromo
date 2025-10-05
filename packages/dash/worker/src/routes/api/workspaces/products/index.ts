import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import { withWorkspaceRole } from "../../../../middleware/with-workspace-role";
import { createProductRoute } from "./routes/create-product";
import { deleteProductRoute } from "./routes/delete-product";
import { getProductRoute } from "./routes/get-product";
import { listProductsRoute } from "./routes/list-products";
import { updateProductRoute } from "./routes/update-product";

export const productsRoute = new Hono<ApiEnv>()
  .use(withWorkspaceRole("workspace_editor"))
  .route("/", listProductsRoute)
  .route("/", createProductRoute)
  .route("/", getProductRoute)
  .route("/", updateProductRoute)
  .route("/", deleteProductRoute);
