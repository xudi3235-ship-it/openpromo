import { writeContentMetricsAnalytics } from "@core/domain/insights/analytics-engine";
import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { AllPlacement } from "@shared/content";
import { Hono } from "hono";

export const testAnalyticsWriteRoute = new Hono<ApiEnv>().get(
  "/",
  async (c) => {
    try {
      const actor = Actor.assert("workspace_user");

      const now = new Date();
      const contentId = `test-${now.getTime()}`;

      writeContentMetricsAnalytics([
        {
          workspaceId: actor.properties.workspaceID,
          contentId,
          placement: AllPlacement.FB_FEED,
          collectedAt: now,
          sourceContentId: "1234567890",
          platform: "facebook",
          metrics: {
            impressions: 1234,
            engagement: 321,
            clicks: 42,
            likes: 15,
            comments: 2,
            shares: 3,
          },
        },
      ]);

      return c.json({
        success: true,
        contentId,
        timestamp: now.toISOString(),
        message: "Test analytics data point written to Analytics Engine",
      });
    } catch (error) {
      return c.json(
        {
          error: "Failed to write analytics test data",
          details: error instanceof Error ? error.message : String(error),
        },
        500,
      );
    }
  },
);
