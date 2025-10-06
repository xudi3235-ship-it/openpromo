import { WORKSPACE_ROLE } from "@core/domain/workspace/auth";
import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import { withWorkspaceRole } from "../../../../middleware/with-workspace-role";
import { fileOperationsRoute } from "./routes/file-operations";
import { multipartRoute } from "./routes/multipart";
import { uploadUrlRoute } from "./routes/upload-url";

export const storageRoute = new Hono<ApiEnv>()
  .route(
    "/upload-url",
    uploadUrlRoute.use(withWorkspaceRole(WORKSPACE_ROLE.EDITOR)),
  )
  .route(
    "/multipart",
    multipartRoute.use(withWorkspaceRole(WORKSPACE_ROLE.EDITOR)),
  )
  .route(
    "/",
    fileOperationsRoute.use(withWorkspaceRole(WORKSPACE_ROLE.VIEWER)),
  );
