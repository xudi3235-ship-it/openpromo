import { Hono } from "hono";
import { openAPIRouteHandler } from "hono-openapi";
import { apiRoutes } from "../api";

export const openapiRoutes = new Hono().get(
  "/json",
  openAPIRouteHandler(apiRoutes, {
    documentation: {
      info: {
        title: "OpenPromo API",
        version: "0.6.9",
        description: "Your mom's favorite",
      },
      servers: [{ url: "http://localhost:3000", description: "Local Server" }],
    },
  }),
);
