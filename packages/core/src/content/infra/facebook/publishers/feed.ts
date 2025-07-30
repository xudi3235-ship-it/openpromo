import { FacebookAdsApi, Page } from "facebook-nodejs-business-sdk";
import { CreateFeedParams, CreateFeedSchema } from "../types";
import { BaseFacebookPublisher } from "./base";
import { unifiedContentTable } from "../../../content.sql";
import z from "zod";
import { FBFeedPlacementSpec } from "../../../schema/placement/facebook";

/**
 * Heart of publishing to facebook feed.
 * It takes in the unifed content piece and
 * normalizes the data & publishes to feed.
 * Internally -- it supports various types of posts, text, link, photo, video, and carousel(multi-media).
 * It fans out the steps required.
 */
export class FacebookFeedPublisher extends BaseFacebookPublisher {
  private unifiedContent: typeof unifiedContentTable.$inferSelect;
  constructor(
    api: FacebookAdsApi,
    page: Page,
    unifiedContent: typeof unifiedContentTable.$inferSelect,
  ) {
    super(page.id, api);
    this.unifiedContent = unifiedContent;
  }

  // 1. publish text post
  public async createTextPost() {
    const spec = this.assertSpec();
    const params: CreateFeedParams = {
      message: spec.postSpec.message,
      published: true, // publish immediately
    };
    return await this.createFeed(["id"], params);
  }

  // 2. publish photo post

  private assertSpec(): z.infer<typeof FBFeedPlacementSpec> {
    const unifiedContent = this.unifiedContent;
    const { success, error, data } = FBFeedPlacementSpec.safeParse(
      unifiedContent.placement_spec,
    );
    if (!success) throw new Error(`Invalid placement_spec: ${error.message}`);

    if (unifiedContent.placement !== "FB_FEED") {
      throw new Error(
        `Expected placement to be FB_FEED, got ${unifiedContent.placement}`,
      );
    }

    return data;
  }
}
