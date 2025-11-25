// Use orval generated client and Zod schemas
import {
  generateAgentVideoJobVideoGeneratePost,
  type VideoGenResponse,
} from "@core/generated/openpromo_backend";
import { generateAgentVideoJobVideoGeneratePostBody as videoGenRequestSchema } from "@core/generated/openpromo_backend.zod";
import type { InferRouterInputs, InferRouterOutputs } from "@orpc/server";
import { orpcBuilder } from "../context";
import { withModalAuth, withWorkspaceRole } from "../middleware";
import {
  createWorkspaceInputSchema,
  workspaceRoleMappers,
} from "../shared/workspace-helpers";

/**
 * Input schema for video generation using the generated Zod schema from orval.
 * The orval-generated schema validates against the exact OpenAPI spec.
 */
const generateVideoInput = createWorkspaceInputSchema(videoGenRequestSchema);

export const generateVideo = orpcBuilder
  .input(generateVideoInput)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .use(withModalAuth)
  .handler(async ({ input }) => {
    // Call the Modal backend using orval-generated client
    // Input is already validated against OpenAPI spec via orval zod schema
    // Modal auth is configured by withModalAuth middleware
    const result = await generateAgentVideoJobVideoGeneratePost(input);

    return {
      response: result.data as VideoGenResponse,
    };
  });

export const videoGenRouter = {
  generate: generateVideo,
};

export type VideoGenRouterOutputs = InferRouterOutputs<typeof videoGenRouter>;
export type VideoGenRouterInputs = InferRouterInputs<typeof videoGenRouter>;
