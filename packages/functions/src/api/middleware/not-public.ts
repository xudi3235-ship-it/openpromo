import { Actor } from "@openpromo/core/actor";
import { HTTPException } from "hono/http-exception";
import type { MiddlewareHandler } from "hono/types";

export const notPublic: () => MiddlewareHandler = () => async (_c, next) => {
  console.log("notPublic middleware triggered");
  const actor = Actor.use();
  console.log("Actor type:", actor.type);
  console.log("Actor details:", actor);

  if (actor.type === "public") {
    console.log("Actor is public, throwing 401 Unauthorized");
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  console.log("Actor is authenticated, proceeding");
  return next();
};
