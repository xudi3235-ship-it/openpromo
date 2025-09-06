import * as z from "zod";

/**
 * IG uses this for unified media object to represent reel, story, and feed.
 * ref: https://developers.facebook.com/docs/instagram-platform/reference/instagram-media
 */
export namespace IGMediaSchema {
  // Nested schema for copyright match actions
  const ActionSchema = z
    .object({
      action: z
        .enum(["BLOCK", "MUTE"])
        .describe(
          "The mitigation action taken against the video violating copyright. Different mitigation steps can be taken for different countries.",
        ),
      geos: z
        .array(z.string())
        .optional()
        .describe("An array of locations where the action applies."),
    })
    .describe(
      "Defines the mitigation steps taken based on the copyright owner's policy.",
    );

  // Nested schema for the copyright owner's policy
  const OwnerCopyrightPolicySchema = z
    .object({
      name: z.string().describe("The name for the copyright owners' policy."),
      actions: z
        .array(ActionSchema)
        .describe(
          "An array of action objects with the mitigations steps taken defined by the copyright owner's policy.",
        ),
    })
    .describe("Object containing details about the copyright owner's policy.");

  // Nested schema for individual copyright matches
  const CopyrightMatchSchema = z
    .object({
      author: z.string().describe("The author of the copyrighted video."),
      content_title: z.string().describe("The name of the copyrighted video."),
      matched_segments: z
        .array(
          z.object({
            duration_in_seconds: z
              .number()
              .describe(
                "The number of seconds the content violates copyright.",
              ),
            segment_type: z
              .enum(["AUDIO", "VIDEO"])
              .describe(
                "The type of segment that contains the copyrighted content.",
              ),
            start_time_in_seconds: z
              .number()
              .describe(
                "The start time of the copyright violation in the video.",
              ),
          }),
        )
        .describe(
          "An array of objects detailing where the copyright violation occurs.",
        ),
      owner_copyright_policy: OwnerCopyrightPolicySchema,
    })
    .describe(
      "Object containing information about a specific copyright match.",
    );

  // Nested schema for the main copyright check information
  const CopyrightCheckInformationSchema = z
    .object({
      status: z
        .object({
          status: z
            .enum(["completed", "error", "in_progress", "not_started"])
            .describe("The status of the copyright detection process."),
          matches_found: z
            .boolean()
            .describe("Indicates if the video was found to violate copyright."),
        })
        .describe("Contains the status of the copyright check."),
      copyright_matches: z
        .array(CopyrightMatchSchema)
        .optional()
        .describe(
          "Returned if a video is violating copyright, with details about the copyrighted material.",
        ),
    })
    .describe(
      "Contains the status and results of a copyright check on the media.",
    );

  export const Schema = z.object({
    alt_text: z
      .string()
      .optional()
      .describe("Descriptive text for images, for accessibility."),
    boost_ads_list: z
      .any()
      .optional()
      .describe(
        "Overview of all Instagram ad information associated with the organic media for ads with ACTIVE status. Requires Instagram API with Facebook Login.",
      ),
    boost_eligibility_info: z
      .any()
      .optional()
      .describe(
        "Information about the eligibility of an Instagram media for boosting as an ad. Requires Instagram API with Facebook Login.",
      ),
    caption: z
      .string()
      .optional()
      .nullable()
      .describe(
        "Caption for the media. Excludes album children. The @ symbol is excluded for non-admins.",
      ),
    comments_count: z
      .int()
      .describe(
        "Count of comments on the media. Excludes comments on album child media and the media's caption. Includes replies on comments.",
      ),
    copyright_check_information:
      CopyrightCheckInformationSchema.optional().describe(
        "Returns status and matches_found objects for copyright violations.",
      ),
    id: z.string().describe("The ID of the media object."),
    is_comment_enabled: z
      .boolean()
      .optional()
      .describe(
        "Indicates if comments are enabled or disabled. Excludes album children.",
      ),
    is_shared_to_feed: z
      .boolean()
      .optional()
      .describe(
        "For Reels only. When true, indicates that the reel can appear in both the Feed and Reels tabs.",
      ),
    legacy_instagram_media_id: z
      .string()
      .optional()
      .describe(
        "The ID for Instagram media created for Marketing API endpoints for v21.0 and older.",
      ),
    like_count: z
      .int()
      .optional()
      .describe(
        "Count of likes on the media. Omitted if the media owner has hidden like counts.",
      ),
    media_product_type: z
      .enum(["AD", "FEED", "STORY", "REELS"])
      .describe(
        "Surface where the media is published. Requires Instagram API with Facebook Login.",
      ),
    media_type: z
      .enum(["CAROUSEL_ALBUM", "IMAGE", "VIDEO"])
      .describe("The type of the media."),
    media_url: z
      .url()
      .optional()
      .describe(
        "The URL for the media. Omitted if the media contains copyrighted material.",
      ),
    owner: z
      .string()
      .optional()
      .describe(
        "Instagram user ID who created the media. Only returned if the app user making the query also created the media.",
      ),
    permalink: z.url().describe("A permanent URL to the media."),
    shortcode: z.string().optional().describe("A shortcode for the media."),
    thumbnail_url: z
      .url()
      .optional()
      .describe("Media thumbnail URL. Only available on VIDEO media."),
    timestamp: z.iso
      .datetime()
      .describe("ISO 8601-formatted creation date in UTC."),
    username: z
      .string()
      .describe("Username of the user who created the media."),
    view_count: z
      .int()
      .optional()
      .describe(
        "View count for Instagram reels. Available for Business Discovery API only.",
      ),
  });
}
