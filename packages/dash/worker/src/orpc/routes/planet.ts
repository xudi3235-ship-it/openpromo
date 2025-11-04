import * as z from "zod";

import { orpcBuilder } from "../context";

const PlanetSchema = z.object({
  id: z.number().int().min(1),
  name: z.string(),
  description: z.string().optional(),
});

export const listPlanet = orpcBuilder
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

export const findPlanet = orpcBuilder
  .input(PlanetSchema.pick({ id: true }))
  .handler(async ({ input: _input }) => {
    // your find code here
    return { id: 1, name: "name" };
  });

export const createPlanet = orpcBuilder
  .input(PlanetSchema.omit({ id: true }))
  .handler(async ({ input: _input, context: _context }) => {
    // your create code here
    return { id: 1, name: "name" };
  });

export const planetRouter = {
  list: listPlanet,
  find: findPlanet,
  create: createPlanet,
};
