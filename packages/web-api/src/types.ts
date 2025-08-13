import type { User as WorkOSUser } from "@workos-inc/node";
import type { apiRoutes } from "./routes/api";

export type MyEnv = {
  Variables: {
    user: WorkOSUser | undefined;
  };
};

export type ApiRoutes = typeof apiRoutes;
export type User = WorkOSUser;
