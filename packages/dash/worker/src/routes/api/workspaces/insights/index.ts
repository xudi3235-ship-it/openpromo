import { WorkspaceInsightsAggregator } from "@core/domain/insights/aggregator";
import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { WorkspaceSummarySchema } from "@shared/insights";
import { Hono } from "hono";
import { z } from "zod";
import { withWorkspaceRole } from "../../../../middleware/with-workspace-role";
import { zValidator } from "../../../../middleware/zod-validator";

const aggregator = new WorkspaceInsightsAggregator();

const timeSeriesQuerySchema = z.object({
  start: z.coerce.date(),
  end: z.coerce.date(),
  interval: z.enum(["day", "week"]).default("day"),
});
const topContentQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(5),
  sortBy: z.enum(["impressions", "engagement"]).default("impressions"),
});

export const insightsRoute = new Hono<ApiEnv>()
  .use(withWorkspaceRole("workspace_viewer"))
  .get("/summary", async (c) => {
    const summary = await aggregator.getSummary({
      workspaceId: Actor.workspaceID(),
    });
    return c.json(WorkspaceSummarySchema.parse(summary));
  })
  .get("/timeseries", zValidator("query", timeSeriesQuerySchema), async (c) => {
    const { start, end, interval } = c.req.valid("query");
    const points = await aggregator.getTimeSeries({
      workspaceId: Actor.workspaceID(),
      range: { start, end },
      interval,
    });
    return c.json(points);
  })
  .get(
    "/top-content",
    zValidator("query", topContentQuerySchema),
    async (c) => {
      const { limit, sortBy } = c.req.valid("query");
      const items = await aggregator.getTopContent({
        workspaceId: Actor.workspaceID(),
        limit,
        sortBy,
      });
      return c.json({ items });
    },
  );
