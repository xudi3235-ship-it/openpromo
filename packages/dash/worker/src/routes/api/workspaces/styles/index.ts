import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import { withWorkspaceRole } from "../../../../middleware/with-workspace-role";
import { createStyleRoute } from "./routes/create-style";
import { deleteStyleRoute } from "./routes/delete-style";
import { deleteStyleGenerationRoute } from "./routes/delete-style-generation";
import { getStyleRoute } from "./routes/get-style";
import { listStyleGenerationsRoute } from "./routes/list-style-generations";
import { listStylesRoute } from "./routes/list-styles";
import { updateStyleRoute } from "./routes/update-style";

export const stylesRoute = new Hono<ApiEnv>()
  .use(withWorkspaceRole("workspace_editor"))
  .route("/", listStylesRoute)
  .route("/", createStyleRoute)
  .route("/", listStyleGenerationsRoute)
  .route("/", deleteStyleGenerationRoute)
  .route("/", getStyleRoute)
  .route("/", updateStyleRoute)
  .route("/", deleteStyleRoute);
