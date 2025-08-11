import { handle, streamHandle } from "hono/aws-lambda";
import "zod-openapi/extend";
import { app } from "../routes";

export const handler = process.env.SST_LIVE ? handle(app) : streamHandle(app);
