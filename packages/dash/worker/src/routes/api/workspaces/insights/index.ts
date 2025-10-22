import { WorkspaceInsightsAggregator } from "@core/domain/insights/aggregator";
import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { AllPlatforms } from "@shared/content";
import {
  InboxSummarySchema,
  InsightsStatusSchema,
  WorkspaceSummarySchema,
} from "@shared/insights";
import { Hono } from "hono";
import { z } from "zod";
import { withWorkspaceRole } from "../../../../middleware/with-workspace-role";
import { zValidator } from "../../../../middleware/zod-validator";
import { ContentEntity } from "../content/shared/types";

const aggregator = new WorkspaceInsightsAggregator();

const timeSeriesQuerySchema = z.object({
  start: z.coerce.date(),
  end: z.coerce.date(),
  interval: z.enum(["day", "week"]).default("day"),
});
const topContentQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(20).default(5),
    sortBy: z.enum(["impressions", "engagement"]).default("impressions"),
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional(),
    platform: z.enum([...Object.values(AllPlatforms)]).optional(),
  })
  .refine(
    (value) =>
      (!value.start && !value.end) ||
      (Boolean(value.start) && Boolean(value.end)),
    {
      message: "Both start and end must be provided",
      path: ["start"],
    },
  );

const inboxRoute = new Hono<ApiEnv>().get("/summary", async (c) => {
  const summary = await aggregator.getInboxSummary({
    workspaceId: Actor.workspaceID(),
  });
  return c.json(InboxSummarySchema.parse(summary));
});

export const insightsRoute = new Hono<ApiEnv>()
  .use(withWorkspaceRole("workspace_viewer"))
  .get("/summary", async (c) => {
    const summary = await aggregator.getSummary({
      workspaceId: Actor.workspaceID(),
    });
    return c.json(WorkspaceSummarySchema.parse(summary));
  })
  .get("/status", async (c) => {
    const status = await aggregator.getStatus({
      workspaceId: Actor.workspaceID(),
    });
    return c.json(InsightsStatusSchema.parse(status));
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
      const { limit, sortBy, start, end, platform } = c.req.valid("query");
      const range =
        start && end
          ? { start: new Date(start), end: new Date(end) }
          : undefined;
      const rows = await aggregator.getTopContent({
        workspaceId: Actor.workspaceID(),
        limit,
        sortBy,
        range,
        platform,
      });

      const items = rows.map((row) =>
        ContentEntity.parse({
          type: "content",
          entity: row,
        }),
      );

      return c.json({ items });
    },
  )
  .route("/inbox", inboxRoute);
