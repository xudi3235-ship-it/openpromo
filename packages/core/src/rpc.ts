/**
 * Connect RPC client for the backend Python service
 */
import type { Interceptor } from "@connectrpc/connect";
import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { FFprobeService } from "@shared/gen/ffprobe/v1/ffprobe_pb";
import { HelloService } from "@shared/gen/hello/v1/hello_pb";
import { JobsService } from "@shared/gen/jobs/v1/jobs_pb";
import { VideoService } from "@shared/gen/video/v1/video_pb";
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
    env.VITE_ENVIRONMENT === "local"
      ? "https://promobase--openpromo-backend-connect-rpc-dev.modal.run"
      : "https://promobase--openpromo-backend-connect-rpc.modal.run",
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

// Jobs service client
export const jobsClient = createClient(JobsService, transport);

// ============ Re-exports ============

// FFprobe types
export type {
  FFprobeRequest,
  FFprobeResponse,
} from "@shared/gen/ffprobe/v1/ffprobe_pb";
export { FFprobeService } from "@shared/gen/ffprobe/v1/ffprobe_pb";
// Hello types
export type {
  HelloRequest,
  HelloResponse,
} from "@shared/gen/hello/v1/hello_pb";
export { HelloService } from "@shared/gen/hello/v1/hello_pb";
// Jobs types
export type {
  JobResultRequest,
  JobResultResponse,
} from "@shared/gen/jobs/v1/jobs_pb";
export { JobsService } from "@shared/gen/jobs/v1/jobs_pb";
// Video types
export type {
  RunFfmpegRequest,
  RunFfmpegResponse,
  TranscodeRequest,
  TranscodeResponse,
} from "@shared/gen/video/v1/video_pb";
export { VideoService } from "@shared/gen/video/v1/video_pb";
