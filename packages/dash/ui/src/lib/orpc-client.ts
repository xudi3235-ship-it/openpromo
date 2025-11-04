import { createORPCClient, onError } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { orpcRouter } from "@worker/orpc";

const link = new RPCLink({
  url: `${import.meta.env.VITE_DASHBOARD_URL}/api/rpc`,
  headers: () => ({}),
  fetch: (input, init) =>
    fetch(input, {
      ...init,
      credentials: "include",
    }),
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

const client: RouterClient<typeof orpcRouter> = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
