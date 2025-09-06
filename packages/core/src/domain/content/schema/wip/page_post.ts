import * as z from "zod";

export namespace PagePostSchema {
  // Basic object with an ID, often used for 'from', 'to', 'tags', etc.
  const IdNameObject = z.object({
    id: z.string(),
    name: z.string().optional(),
  });

  // Schema for actions like 'Comment' or 'Like' on a post
  const PostAction = z.object({
    name: z.string(),
    link: z.url(),
  });

  // Define the TypeScript type for a PostAttachment to handle recursion
  interface PostAttachmentType {
    description?: string;
    media?: {
      image?: {
        height: number;
        src: string;
        width: number;
      };
    };
    target?: {
      id?: string;
      url: string;
    };
    title?: string;
    type?: string;
    url?: string;
    subattachments?: PostAttachmentType[];
  }

  // Schema for attachments, which can contain various media types.
  // z.lazy is used to properly handle the recursive 'subattachments' type.
  const PostAttachment: z.ZodType<PostAttachmentType> = z.lazy(() =>
    z.object({
      description: z
        .string()
        .optional()
        .describe("The description of the attachment."),
      media: z
        .object({
          image: z
            .object({
              height: z.number(),
              src: z.url(),
              width: z.number(),
            })
            .optional(),
        })
        .optional(),
      target: z
        .object({
          id: z.string().optional(),
          url: z.url(),
        })
        .optional(),
      title: z.string().optional().describe("The title of the attachment."),
      type: z.string().optional(),
      url: z.url().optional(),
      subattachments: z
        .array(PostAttachment)
        .optional()
        .describe("Media attachments to a post that are not the primary one."),
    }),
  );

  // The main Zod schema for a Facebook Page Post
  export const Schema = z.object({
    id: z.string().describe("The post ID"),
    actions: z.array(PostAction).optional().describe("Action links"),
    admin_creator: z
      .union([
        IdNameObject,
        z.object({ id: z.string(), name: z.string().optional() }),
      ])
      .optional()
      .describe(
        "The admin creator of a Page Post. Only available if there exists more than one admin for the page.",
      ),
    allowed_advertising_objectives: z
      .array(z.string())
      .optional()
      .describe("Objectives under which this post can be advertised"),
    application: IdNameObject.optional().describe(
      "Information about the app this post was published by.",
    ),
    backdated_time: z.iso
      .datetime()
      .nullable()
      .optional()
      .describe(
        "The backdated time for backdate post. For regular post, this field will be set to null.",
      ),
    call_to_action: z
      .object({
        type: z.string(),
        value: z.any(),
      })
      .optional()
      .describe(
        "The call to action type used in any Page posts for mobile app engagement ads.",
      ),
    can_reply_privately: z
      .boolean()
      .optional()
      .describe(
        "Whether the page viewer can send a private reply to this post",
      ),
    child_attachments: z
      .array(PostAttachment)
      .optional()
      .describe("Sub-shares of a multi-link share post"),
    comments_mirroring_domain: z
      .string()
      .optional()
      .describe(
        "If comments are being mirrored to an external site, this function returns the domain of that external site.",
      ),
    coordinates: z
      .object({
        checkin_id: z.string().optional(),
        author_uid: z.string().optional(),
        page_id: z.string().optional(),
        target_id: z.string().optional(),
        target_href: z.string().optional(),
        coords: z
          .object({
            latitude: z.number().optional(),
            longitude: z.number().optional(),
          })
          .optional(),
        tagged_uids: z.array(z.string()).optional(),
        timestamp: z.number().optional(),
        message: z.string().optional(),
        target_type: z.string().optional(),
      })
      .optional()
      .describe("An array of information about the attachment to the post"),
    created_time: z.iso
      .datetime()
      .describe("The time the post was published, expressed as UNIX timestamp"),
    event: z
      .object({
        id: z.string(),
        name: z.string().optional(),
      })
      .optional()
      .describe(
        "If this Post has a place, the event associated with the place",
      ),
    expanded_height: z
      .int()
      .optional()
      .describe("An array of information about the attachment to the post"),
    expanded_width: z
      .int()
      .optional()
      .describe("An array of information about the attachment to the post"),
    feed_targeting: z
      .object({
        country: z.string().optional(),
        cities: z.array(z.string()).optional(),
        regions: z.array(z.string()).optional(),
        genders: z.array(z.number()).optional(),
        age_min: z.number().optional(),
        age_max: z.number().optional(),
        education_statuses: z.array(z.string()).optional(),
        college_years: z.array(z.number()).optional(),
        relationship_statuses: z.array(z.string()).optional(),
        interests: z.array(z.string()).optional(),
        interested_in: z.array(z.string()).optional(),
        user_adclusters: z.array(z.string()).optional(),
        locales: z.array(z.string()).optional(),
        countries: z.array(z.string()).optional(),
        geo_locations: z.any().optional(),
        work_positions: z.array(z.string()).optional(),
        work_employers: z.array(z.string()).optional(),
        education_majors: z.array(z.string()).optional(),
        education_schools: z.array(z.string()).optional(),
        family_statuses: z.array(z.string()).optional(),
        life_events: z.array(z.string()).optional(),
        industries: z.array(z.string()).optional(),
        politics: z.array(z.string()).optional(),
        ethnic_affinity: z.array(z.string()).optional(),
        generation: z.array(z.string()).optional(),
        fan_of: z.array(z.string()).optional(),
        relevant_until_ts: z.number().optional(),
      })
      .optional()
      .describe(
        "Object that controls Feed targeting for this post. Anyone in these groups will be more likely to see this post, others will be less likely, but may still see it anyway.",
      ),
    from: IdNameObject.optional().describe(
      "The ID of the user, page, group, or event that published the post",
    ),
    full_picture: z
      .url()
      .optional()
      .describe("Full size picture from attachment"),
    height: z
      .int()
      .optional()
      .describe("An array of information about the attachment to the post"),
    icon: z
      .url()
      .optional()
      .describe("A link to an icon representing the type of this post."),
    is_app_share: z
      .boolean()
      .optional()
      .describe("Whether or not the post references an app"),
    is_eligible_for_promotion: z
      .boolean()
      .optional()
      .describe("Whether the post is eligible for promotion."),
    is_expired: z
      .boolean()
      .optional()
      .describe("Whether the post has expiration time that has passed"),
    is_hidden: z
      .boolean()
      .optional()
      .describe("Whether a post has been set to hidden"),
    is_inline_created: z
      .boolean()
      .optional()
      .describe(
        "Returns True if the post was created inline when creating ads.",
      ),
    is_popular: z
      .boolean()
      .optional()
      .describe(
        "Whether the post is currently popular. Based on whether the total actions as a percentage of reach exceeds a certain threshold",
      ),
    is_published: z
      .boolean()
      .optional()
      .describe(
        "Indicates whether a scheduled post was published (applies to scheduled Page Post only, for users post and instanlty published posts this value is always true)",
      ),
    is_spherical: z
      .boolean()
      .optional()
      .describe("Whether the post is a spherical video post"),
    message: z.string().optional().describe("The message written in the post"),
    message_tags: z
      .array(
        IdNameObject.extend({
          length: z.number(),
          offset: z.number(),
          type: z.string(),
        }),
      )
      .optional()
      .describe(
        "Profiles tagged in message. This is an object with a unique key for each tag in the message",
      ),
    multi_share_end_card: z
      .boolean()
      .optional()
      .describe("Whether display the end card for a multi-link share post"),
    multi_share_optimized: z
      .boolean()
      .optional()
      .describe(
        "Whether automatically select the order of the links in multi-link share post when used in an ad",
      ),
    parent_id: z
      .string()
      .optional()
      .describe(
        "The ID of a parent post for this post, if it exists. For example, if this story is a 'Your Page was mentioned in a post' story, the parent_id will be the original post where the mention happened",
      ),
    permalink_url: z
      .url()
      .describe(
        "The permanent static URL to the post on www.facebook.com. Example: https://www.facebook.com/FacebookforDevelopers/posts/10153449196353553",
      ),
    place: z
      .object({
        id: z.string(),
        name: z.string(),
        location: z
          .object({
            city: z.string().optional(),
            country: z.string().optional(),
            latitude: z.number().optional(),
            longitude: z.number().optional(),
            street: z.string().optional(),
            zip: z.string().optional(),
          })
          .optional(),
      })
      .optional()
      .describe("ID of the place associated with the post"),
    privacy: z
      .object({
        description: z.string().optional(),
        value: z
          .enum([
            "EVERYONE",
            "ALL_FRIENDS",
            "FRIENDS_OF_FRIENDS",
            "SELF",
            "CUSTOM",
          ])
          .optional(),
        allow: z.string().optional(),
        deny: z.string().optional(),
      })
      .optional()
      .describe("The privacy settings for a post"),
    promotable_id: z
      .string()
      .optional()
      .describe(
        "ID of post to use for promotion for stories that cannot be promoted directly",
      ),
    properties: z
      .array(
        z.object({
          name: z.string(),
          text: z.string(),
        }),
      )
      .optional()
      .describe(
        "A list of properties for any attached video, for example, the length of the video.",
      ),
    scheduled_publish_time: z
      .number()
      .optional()
      .describe("UNIX timestamp of the scheduled publish time for the post"),
    shares: z
      .object({
        count: z.int().prefault(0),
      })
      .optional()
      .describe("Number of times the post has been shared"),
    status_type: z
      .string()
      .optional()
      .describe("Description of the type of a status update."),
    story: z
      .string()
      .optional()
      .describe(
        'Text of stories not intentionally generated by users, such as those generated when two users become friends. You must have the "Include recent activity stories" migration enabled in your app to retrieve this field',
      ),
    story_tags: z
      .array(
        IdNameObject.extend({
          length: z.number(),
          offset: z.number(),
          type: z.string(),
        }),
      )
      .optional()
      .describe("The list of tags in the post description"),
    subscribed: z
      .boolean()
      .optional()
      .describe("Whether user is subscribed to the post"),
    target: IdNameObject.optional().describe(
      "The profile this was posted on if different from the author",
    ),
    targeting: z
      .object({
        country: z.string().optional(),
        cities: z.array(z.string()).optional(),
        regions: z.array(z.string()).optional(),
        zips: z.array(z.string()).optional(),
        genders: z.array(z.number()).optional(),
        college_networks: z.array(z.string()).optional(),
        work_networks: z.array(z.string()).optional(),
        age_min: z.number().optional(),
        age_max: z.number().optional(),
        education_statuses: z.array(z.string()).optional(),
        college_years: z.array(z.number()).optional(),
        college_majors: z.array(z.string()).optional(),
        political_views: z.array(z.string()).optional(),
        relationship_statuses: z.array(z.string()).optional(),
        interests: z.array(z.string()).optional(),
        keywords: z.array(z.string()).optional(),
        interested_in: z.array(z.string()).optional(),
        user_clusters: z.array(z.string()).optional(),
        user_clusters2: z.array(z.string()).optional(),
        user_clusters3: z.array(z.string()).optional(),
        user_adclusters: z.array(z.string()).optional(),
        excluded_user_adclusters: z.array(z.string()).optional(),
        custom_audiences: z.array(z.string()).optional(),
        excluded_custom_audiences: z.array(z.string()).optional(),
        locales: z.array(z.string()).optional(),
        radius: z.number().optional(),
        connections: z.array(z.string()).optional(),
        excluded_connections: z.array(z.string()).optional(),
        friends_of_connections: z.array(z.string()).optional(),
        countries: z.array(z.string()).optional(),
        excluded_user_clusters: z.array(z.string()).optional(),
        adgroup_id: z.string().optional(),
        user_event: z.string().optional(),
        qrt_versions: z.array(z.string()).optional(),
        page_types: z.array(z.string()).optional(),
        user_os: z.array(z.string()).optional(),
        user_device: z.array(z.string()).optional(),
        action_spec: z.any().optional(),
        action_spec_friend: z.any().optional(),
        action_spec_excluded: z.any().optional(),
        geo_locations: z.any().optional(),
        excluded_geo_locations: z.any().optional(),
        targeted_entities: z.array(z.string()).optional(),
        conjunctive_user_adclusters: z.array(z.string()).optional(),
        wireless_carrier: z.array(z.string()).optional(),
        site_category: z.array(z.string()).optional(),
        work_positions: z.array(z.string()).optional(),
        work_employers: z.array(z.string()).optional(),
        education_majors: z.array(z.string()).optional(),
        education_schools: z.array(z.string()).optional(),
        family_statuses: z.array(z.string()).optional(),
        life_events: z.array(z.string()).optional(),
        behaviors: z.array(z.string()).optional(),
        travel_status: z.array(z.string()).optional(),
        industries: z.array(z.string()).optional(),
        politics: z.array(z.string()).optional(),
        markets: z.array(z.string()).optional(),
        income: z.array(z.string()).optional(),
        net_worth: z.array(z.string()).optional(),
        home_type: z.array(z.string()).optional(),
        home_ownership: z.array(z.string()).optional(),
        home_value: z.array(z.string()).optional(),
        ethnic_affinity: z.array(z.string()).optional(),
        generation: z.array(z.string()).optional(),
        household_composition: z.array(z.string()).optional(),
        moms: z.array(z.string()).optional(),
        office_type: z.array(z.string()).optional(),
        interest_clusters_expansion: z.array(z.string()).optional(),
        dynamic_audience_ids: z.array(z.string()).optional(),
        product_audience_specs: z.array(z.any()).optional(),
        excluded_product_audience_specs: z.array(z.any()).optional(),
        exclusions: z.any().optional(),
        flexible_spec: z.any().optional(),
        engagement_specs: z.array(z.any()).optional(),
        excluded_engagement_specs: z.array(z.any()).optional(),
      })
      .optional()
      .describe(
        "Object that limited the audience for this content. Anyone not in these demographics will not be able to view this content. This will not override any Page-level demographic restrictions that may be in place.",
      ),
    timeline_visibility: z
      .string()
      .optional()
      .describe("Timeline visibility information of the post"),
    updated_time: z.iso
      .datetime()
      .describe(
        "The time the post was last updated, which occurs when a user comments on the post.",
      ),
    via: IdNameObject.optional().describe(
      "ID of the user or Page the post was shared from",
    ),
    width: z
      .int()
      .optional()
      .describe("An array of information about the attachment to the post"),
  });
}
