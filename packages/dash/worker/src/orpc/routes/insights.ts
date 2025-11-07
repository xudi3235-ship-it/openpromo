import { WorkspaceInsightsAggregator } from "@core/domain/insights/aggregator";
import * as z from "zod";
import { orpcBuilder } from "../context";
import { withWorkspaceRole } from "../middleware";
import {
  createWorkspaceInputSchema,
  workspaceRoleMappers,
} from "../shared/workspace-helpers";

const aggregator = new WorkspaceInsightsAggregator();

const getSnapshotInput = createWorkspaceInputSchema(
  z.object({
    forceRegenerate: z.boolean().optional().default(false),
  }),
);

export const getSnapshot = orpcBuilder
  .input(getSnapshotInput)
  .use(withWorkspaceRole, workspaceRoleMappers.viewer)
  .handler(async ({ input, context }) => {
    const workspaceId = context.workspace.workspaceID;

    if (input.forceRegenerate) {
      const snapshot = await aggregator.generateSnapshotForWorkspace({
        workspaceId,
      });

      return {
        snapshotDate: snapshot.date,
        snapshot,
      };
    }

    const latest = await aggregator.getLatestSnapshot({ workspaceId });
    if (latest) {
      return latest;
    }

    const generated = await aggregator.generateSnapshotForWorkspace({
      workspaceId,
    });

    return {
      snapshotDate: generated.date,
      snapshot: generated,
    };
  });

export const insightsRouter = {
  getSnapshot,
};
