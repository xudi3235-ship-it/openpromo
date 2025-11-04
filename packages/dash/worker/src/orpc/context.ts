import type { ApiEnv } from "@core/helpers/api-env";
import { os } from "@orpc/server";
import type { Context } from "hono";
import type { WorkspaceRoleCheckResult } from "../helpers/workspace-role-checker";

// Shared context for every oRPC procedure so we can attach hono context data.
export interface OrpcContext {
  honoContext: Context<ApiEnv>;
}

// Context with workspace enforced - use this for workspace-scoped procedures
export interface OrpcWorkspaceContext extends OrpcContext {
  workspace: WorkspaceRoleCheckResult;
}

export const orpcBuilder = os.$context<OrpcContext>();
