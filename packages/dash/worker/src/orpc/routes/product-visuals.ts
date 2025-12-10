import { Presets } from "@core/domain/agents/presets";
import type { InferRouterInputs, InferRouterOutputs } from "@orpc/server";
import { z } from "zod";
import { orpcBuilder } from "../context";
import { withWorkspaceRole } from "../middleware";
import {
  createWorkspaceInputSchema,
  workspaceRoleMappers,
} from "../shared/workspace-helpers";

/**
 * Get all available presets for product visuals
 */
export const getPresets = orpcBuilder
  .input(createWorkspaceInputSchema(z.object({})))
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async () => {
    const presetManager = new Presets.Manager();
    const presets = await presetManager.loadClientPresets();

    return {
      presets,
    };
  });

export const productVisualsRouter = {
  presets: getPresets,
};

export type ProductVisualsRouterOutputs = InferRouterOutputs<
  typeof productVisualsRouter
>;
export type ProductVisualsRouterInputs = InferRouterInputs<
  typeof productVisualsRouter
>;
