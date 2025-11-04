import type { ApiEnv } from "@core/helpers/api-env";
import { os } from "@orpc/server";
import type { Context } from "hono";
import * as z from "zod";

// define ctx and pass through hono context
export interface OrpcContext {
  honoContext: Context<ApiEnv>;
}

const base = os.$context<OrpcContext>();

const PlanetSchema = z.object({
  id: z.number().int().min(1),
  name: z.string(),
  description: z.string().optional(),
});

export const listPlanet = os
  .input(
    z.object({
      limit: z.number().int().min(1).max(100).optional(),
      cursor: z.number().int().min(0).default(0),
    }),
  )
  .handler(async ({ input: _input }) => {
    // your list code here
    return [{ id: 1, name: "name" }];
  });

export const findPlanet = os
  .input(PlanetSchema.pick({ id: true }))
  .handler(async ({ input: _input }) => {
    // your find code here
    return { id: 1, name: "name" };
  });

export const createPlanet = base
  .input(PlanetSchema.omit({ id: true }))
  .handler(async ({ input: _input, context: _context }) => {
    // your create code here
    return { id: 1, name: "name" };
  });

export const orpcRouter = {
  planet: {
    list: listPlanet,
    find: findPlanet,
    create: createPlanet,
  },
};
