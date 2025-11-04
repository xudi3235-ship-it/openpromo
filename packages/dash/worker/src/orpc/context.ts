import type { ApiEnv } from "@core/helpers/api-env";
import { os } from "@orpc/server";
import type { Context } from "hono";

// Shared context for every oRPC procedure so we can attach hono context data.
export interface OrpcContext {
  honoContext: Context<ApiEnv>;
}

export const orpcBuilder = os.$context<OrpcContext>();
