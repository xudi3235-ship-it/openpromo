import { WorkspaceInsightsAggregator } from "@core/domain/insights/aggregator";
import { AllPlatforms } from "@shared/content";
import {
  InboxSummarySchema,
  InsightsStatusSchema,
  TimeSeriesPointSchema,
  WorkspaceSummarySchema,
} from "@shared/insights";
import * as z from "zod";
import { ContentEntity } from "../../routes/api/workspaces/content/shared/types";
import { orpcBuilder } from "../context";
import { withWorkspaceRole } from "../middleware";
import {
  createWorkspaceInputSchema,
  workspaceRoleMappers,
} from "../shared/workspace-helpers";

const aggregator = new WorkspaceInsightsAggregator();

const workspaceOnlyInput = createWorkspaceInputSchema(z.object({}));

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

export const getSummary = orpcBuilder
  .input(workspaceOnlyInput)
  .use(withWorkspaceRole, workspaceRoleMappers.viewer)
  .handler(async ({ context }) => {
    const summary = await aggregator.getSummary({
      workspaceId: context.workspace.workspaceID,
    });

    return WorkspaceSummarySchema.parse(summary);
  });

export const getStatus = orpcBuilder
  .input(workspaceOnlyInput)
  .use(withWorkspaceRole, workspaceRoleMappers.viewer)
  .handler(async ({ context }) => {
    const status = await aggregator.getStatus({
      workspaceId: context.workspace.workspaceID,
    });

    return InsightsStatusSchema.parse(status);
  });

const timeSeriesInput = createWorkspaceInputSchema(
  z.object({
    start: z.coerce.date(),
    end: z.coerce.date(),
    interval: z.enum(["day", "week"]).default("day"),
  }),
);

export const getTimeSeries = orpcBuilder
  .input(timeSeriesInput)
  .use(withWorkspaceRole, workspaceRoleMappers.viewer)
  .handler(async ({ input, context }) => {
    const range = {
      start: input.start,
      end: input.end,
    };

    const points = await aggregator.getTimeSeries({
      workspaceId: context.workspace.workspaceID,
      range,
      interval: input.interval,
    });

    return points.map((point) => TimeSeriesPointSchema.parse(point));
  });

const topContentInput = createWorkspaceInputSchema(
  z
    .object({
      limit: z.number().int().min(1).max(20).optional().default(5),
      sortBy: z
        .enum(["impressions", "engagement"])
        .optional()
        .default("impressions"),
      start: z.coerce.date().optional(),
      end: z.coerce.date().optional(),
      platform: z.enum([...Object.values(AllPlatforms)]).optional(),
    })
    .refine(
      (value) => (value.start && value.end) || (!value.start && !value.end),
      {
        message: "Both start and end must be provided",
        path: ["start"],
      },
    ),
);

export const getTopContent = orpcBuilder
  .input(topContentInput)
  .use(withWorkspaceRole, workspaceRoleMappers.viewer)
  .handler(async ({ input, context }) => {
    const range =
      input.start && input.end
        ? { start: input.start, end: input.end }
        : undefined;

    const rows = await aggregator.getTopContent({
      workspaceId: context.workspace.workspaceID,
      limit: input.limit ?? 5,
      sortBy: input.sortBy ?? "impressions",
      range,
      platform: input.platform,
    });

    const items = rows.map((row) =>
      ContentEntity.parse({
        type: "content",
        entity: row,
      }),
    );

    return { items };
  });

export const getInboxSummary = orpcBuilder
  .input(workspaceOnlyInput)
  .use(withWorkspaceRole, workspaceRoleMappers.viewer)
  .handler(async ({ context }) => {
    const summary = await aggregator.getInboxSummary({
      workspaceId: context.workspace.workspaceID,
    });

    return InboxSummarySchema.parse(summary);
  });

export const insightsRouter = {
  getSnapshot,
  getSummary,
  getStatus,
  getTimeSeries,
  getTopContent,
  getInboxSummary,
};
