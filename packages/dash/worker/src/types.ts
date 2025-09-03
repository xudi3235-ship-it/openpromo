import type { Hyperdrive, Workflow } from "@cloudflare/workers-types";
import type { OrganizationRole } from "@openpromo/core/workspace/auth";
import type { User } from "@workos-inc/node";
import type { apiRoutes } from "./routes/api";
import type { authRoutes } from "./routes/auth";

export type ApiEnv = {
  Variables: {
    user: User | undefined;
    organizationId: string | undefined;
    role: OrganizationRole | undefined;
  };
  Bindings: {
    HYPERDRIVE: Hyperdrive;
    WORKFLOW: Workflow;
  };
};

export type ApiRoutes = typeof apiRoutes;
export type AuthRoutes = typeof authRoutes;
