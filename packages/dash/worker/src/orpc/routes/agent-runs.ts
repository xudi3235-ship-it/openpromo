import { EntAgentRun } from "@core/domain/agent-run";
import type { InferRouterInputs, InferRouterOutputs } from "@orpc/server";
import { VideoGenRealtime } from "@shared/agents";
import { z } from "zod";
import { orpcBuilder } from "../context";
import { withWorkspaceRole } from "../middleware";
import {
  createWorkspaceInputSchema,
  workspaceRoleMappers,
} from "../shared/workspace-helpers";

const listAgentRunsInput = createWorkspaceInputSchema(
  z.object({
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(50).default(20),
    status: VideoGenRealtime.RunStatusZod.optional(),
    agentName: VideoGenRealtime.AgentNameZod.optional(),
    hasImages: z.boolean().optional(),
    hasVideos: z.boolean().optional(),
  }),
);

export const listAgentRuns = orpcBuilder
  .input(listAgentRunsInput)
  .use(withWorkspaceRole, workspaceRoleMappers.viewer)
  .handler(async ({ input }) => {
    const { page, pageSize, status, agentName, hasImages, hasVideos } = input;

    const result = await EntAgentRun.list({
      page,
      pageSize,
      status,
      agentName: agentName ?? undefined,
      hasImages,
      hasVideos,
    });

    return {
      items: result.runs.map((run) => run.toJSON()),
      pagination: result.pagination,
    };
  });

const getAgentRunInput = createWorkspaceInputSchema(
  z.object({
    id: z.string().min(1),
  }),
);

export const getAgentRun = orpcBuilder
  .input(getAgentRunInput)
  .use(withWorkspaceRole, workspaceRoleMappers.viewer)
  .handler(async ({ input }) => {
    const run = await EntAgentRun.fromID(input.id);
    return run.toJSON();
  });

const deleteAgentRunsInput = createWorkspaceInputSchema(
  z.object({
    ids: z.array(z.string().min(1)).min(1),
  }),
);

export const deleteAgentRuns = orpcBuilder
  .input(deleteAgentRunsInput)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input }) => {
    return EntAgentRun.deleteBatch(input.ids);
  });

export const agentRunsRouter = {
  list: listAgentRuns,
  get: getAgentRun,
  delete: deleteAgentRuns,
};

export type AgentRunsRouterOutputs = InferRouterOutputs<typeof agentRunsRouter>;
export type AgentRunsRouterInputs = InferRouterInputs<typeof agentRunsRouter>;
