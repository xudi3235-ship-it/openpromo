import { env } from "@core/utils/env";
import { WorkOS } from "@workos-inc/node";

export const getWorkOS = () => {
  return new WorkOS(env.WORKOS_API_KEY, {
    clientId: env.WORKOS_CLIENT_ID,
  });
};
