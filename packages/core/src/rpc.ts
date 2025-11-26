/**
 * Connect RPC client for the backend Python service
 */
import type { Interceptor } from "@connectrpc/connect";
import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { HelloService } from "./gen/hello/v1/hello_pb";
import { env } from "./utils/env";

// Interceptor to add auth headers to all requests
const authInterceptor: Interceptor = (next) => async (req) => {
  req.header.set("Modal-Key", env.MODAL_PROXY_AUTH_TOKEN_ID);
  req.header.set("Modal-Secret", env.MODAL_PROXY_AUTH_TOKEN_SECRET);
  return next(req);
};

// Create transport for Connect protocol
const transport = createConnectTransport({
  // connect rpc backend
  baseUrl:
    env.VITE_ENVIRONMENT === "production"
      ? "https://promobase--openpromo-backend-connect-rpc.modal.run"
      : "https://promobase--openpromo-backend-connect-rpc-dev.modal.run",
  interceptors: [authInterceptor],
  // Use "manual" redirect for Cloudflare Workers compatibility
  fetch: (input, init) => fetch(input, { ...init, redirect: "manual" }),
});

// Create typed client
export const helloClient = createClient(HelloService, transport);

export type { HelloRequest, HelloResponse } from "./gen/hello/v1/hello_pb";
// Re-export types for convenience
export { HelloService } from "./gen/hello/v1/hello_pb";
