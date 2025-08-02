import "zod-openapi/extend";
import { app, routes } from "./routes";
import { handle, streamHandle } from "hono/aws-lambda";

export type Routes = typeof routes;
export const handler = process.env.SST_LIVE ? handle(app) : streamHandle(app);
