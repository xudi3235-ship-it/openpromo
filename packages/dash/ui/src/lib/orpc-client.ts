import { createORPCClient, onError } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { orpcRouter } from "@worker/orpc";

const link = new RPCLink({
  url: `${window.location.origin}/api/rpc`, // FIXME: should prob use env var
  headers: () => ({}),
  fetch: (input, init) =>
    fetch(input, {
      ...init,
      credentials: "include",
    }),
  interceptors: [
    onError((error) => {
      // Suppress abort errors - these are expected during query cleanup/cancellation
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      console.error(error);
    }),
  ],
});

const client: RouterClient<typeof orpcRouter> = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
