import { handle, streamHandle } from "hono/aws-lambda";
import "zod-openapi/extend";
import { app, type routes } from "./routes";

export type Routes = typeof routes;
export const handler = process.env.SST_LIVE ? handle(app) : streamHandle(app);
