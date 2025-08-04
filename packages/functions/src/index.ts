import { handle, streamHandle } from "hono/aws-lambda";
import "zod-openapi/extend";
import { auth } from "./auth/index";
import { app, routes } from "./routes";

export type Routes = typeof routes;
export const handler = process.env.SST_LIVE ? handle(app) : streamHandle(app);
export const authHandler = process.env.SST_LIVE ? handle(auth) : streamHandle(auth);
