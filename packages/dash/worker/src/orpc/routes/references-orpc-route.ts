import { ReferenceSearch } from "@core/domain/reference/reference-search";
import {
  type InferRouterInputs,
  type InferRouterOutputs,
  ORPCError,
} from "@orpc/server";
import * as z from "zod";
import { orpcBuilder } from "../context";
import { withWorkspaceRole } from "../middleware";
import {
  createWorkspaceInputSchema,
  workspaceRoleMappers,
} from "../shared/workspace-helpers";

/**
 * Search references using semantic similarity
 */
const searchReferences = orpcBuilder
  .input(
    createWorkspaceInputSchema(
      z.object({
        query: z.string().min(1).max(500),
        topK: z.number().int().min(1).max(100).default(20),
      }),
    ),
  )
  .use(withWorkspaceRole, workspaceRoleMappers.viewer)
  .handler(async ({ input }) => {
    const results = await ReferenceSearch.findSimilar(input.query, {
      topK: input.topK,
    });

    return { results };
  });

/**
 * List all references with optional filtering
 */
const listAllReferences = orpcBuilder
  .input(
    createWorkspaceInputSchema(
      z.object({
        topK: z.number().int().min(1).max(100).default(50),
        industries: z.array(z.string()).optional(),
      }),
    ),
  )
  .use(withWorkspaceRole, workspaceRoleMappers.viewer)
  .handler(async ({ input }) => {
    const results = await ReferenceSearch.list({
      topK: input.topK,
    });

    return { results };
  });

/**
 * Get a single reference by ID (R2 key)
 */
const getReference = orpcBuilder
  .input(
    createWorkspaceInputSchema(
      z.object({
        id: z.string().min(1),
      }),
    ),
  )
  .use(withWorkspaceRole, workspaceRoleMappers.viewer)
  .handler(async ({ input }) => {
    const reference = await ReferenceSearch.getById(input.id);

    if (!reference) {
      throw new ORPCError("NOT_FOUND", {
        message: `Reference not found: ${input.id}`,
      });
    }

    return { reference };
  });

/**
 * Delete a reference from the index (requires editor role)
 */
const removeReference = orpcBuilder
  .input(
    createWorkspaceInputSchema(
      z.object({
        id: z.string().min(1),
      }),
    ),
  )
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input }) => {
    await ReferenceSearch.remove(input.id);
    return { id: input.id };
  });

export const referencesRouter = {
  search: searchReferences,
  list: listAllReferences,
  get: getReference,
  delete: removeReference,
};

export type ReferencesRouterOutputs = InferRouterOutputs<
  typeof referencesRouter
>;
export type ReferencesRouterInputs = InferRouterInputs<typeof referencesRouter>;
