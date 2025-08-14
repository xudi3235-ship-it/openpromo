import type { User as WorkOSUser } from "@workos-inc/node";
import type { apiRoutes } from "./routes/api";

export type ApiEnv = {
  Variables: {
    user: WorkOSUser | undefined;
  };
  Bindings: {
    HYPERDRIVE: Hyperdrive;
  };
};

export type ApiRoutes = typeof apiRoutes;
export type User = WorkOSUser;
