import type { ApiEnv } from "@openpromo/core/actors/index";
import { Hono } from "hono";
import { imagesRoute } from "./images.js";

export const mediaRoute = new Hono<ApiEnv>().route("/images", imagesRoute);
