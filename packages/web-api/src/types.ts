import type { Hyperdrive } from "@cloudflare/workers-types";
import type { AuthenticateWithSessionCookieSuccessResponse } from "@workos-inc/node";
import type { OrganizationRole } from "./constants/auth";
import type { apiRoutes } from "./routes/api";

export type User = AuthenticateWithSessionCookieSuccessResponse["user"];
export type ApiRoutes = typeof apiRoutes;

export type ApiEnv = {
  Variables: {
    user: User | undefined;
    organizationId: string | undefined;
    role: OrganizationRole | undefined;
  };
  Bindings: {
    HYPERDRIVE: Hyperdrive;
  };
};
