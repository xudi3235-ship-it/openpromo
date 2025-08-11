import { WorkOS } from "@workos-inc/node";
import { Resource } from "sst";

export const useWorkOS = () => {
  return new WorkOS(Resource.WORKOS_API_KEY.value, {
    clientId: Resource.WORKOS_CLIENT_ID.value,
  });
};
