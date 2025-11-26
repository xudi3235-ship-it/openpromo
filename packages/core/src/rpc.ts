/**
 * Connect RPC client for the backend Python service
 */
import type { Interceptor } from "@connectrpc/connect";
import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { FFprobeService } from "./gen/ffprobe/v1/ffprobe_pb";
import { HelloService } from "./gen/hello/v1/hello_pb";
import { VideoService } from "./gen/video/v1/video_pb";
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

// ============ RPC Clients ============

// Hello service client
export const helloClient = createClient(HelloService, transport);

// Video service client
export const videoClient = createClient(VideoService, transport);

// FFprobe service client
export const ffprobeClient = createClient(FFprobeService, transport);

// ============ Re-exports ============

// FFprobe types
export type {
  FFprobeRequest,
  FFprobeResponse,
} from "./gen/ffprobe/v1/ffprobe_pb";
export { FFprobeService } from "./gen/ffprobe/v1/ffprobe_pb";
// Hello types
export type { HelloRequest, HelloResponse } from "./gen/hello/v1/hello_pb";
export { HelloService } from "./gen/hello/v1/hello_pb";
// Video types
export type {
  TranscodeRequest,
  TranscodeResponse,
} from "./gen/video/v1/video_pb";
export { VideoService } from "./gen/video/v1/video_pb";
