import { WorkOS } from "@workos-inc/node";
import { env } from "@/utils/env";

export const getWorkOS = () => {
  return new WorkOS(env.WORKOS_API_KEY, {
    clientId: env.WORKOS_CLIENT_ID,
  });
};
