import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import { withWorkspaceRole } from "../../../../middleware/with-workspace-role";
import { directUploadRoute } from "./routes/direct-upload";
import { fileOperationsRoute } from "./routes/file-operations";
import { multipartRoute } from "./routes/multipart";
import { uploadUrlRoute } from "./routes/upload-url";

export const storageRoute = new Hono<ApiEnv>()
  .use(withWorkspaceRole("workspace_editor"))
  .route("/upload", directUploadRoute)
  .route("/upload-url", uploadUrlRoute)
  .route("/multipart", multipartRoute)
  .route("/", fileOperationsRoute);
