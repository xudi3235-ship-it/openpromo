import { z } from "zod";

export namespace PagePostSchema {
  // Basic object with an ID, often used for 'from', 'to', 'tags', etc.
  const IdNameObject = z.object({
    id: z.string(),
    name: z.string().optional(),
  });

  // Schema for actions like 'Comment' or 'Like' on a post
  const PostAction = z.object({
    name: z.string(),
    link: z.string().url(),
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
              src: z.string().url(),
              width: z.number(),
            })
            .optional(),
        })
        .optional(),
      target: z
        .object({
          id: z.string().optional(),
          url: z.string().url(),
        })
        .optional(),
      title: z.string().optional().describe("The title of the attachment."),
      type: z.string().optional(),
      url: z.string().url().optional(),
      subattachments: z
        .array(PostAttachment)
        .optional()
        .describe("Media attachments to a post that are not the primary one."),
    }),
  );

  // The main Zod schema for a Facebook Page Post
  export const Schema = z.object({
    id: z.string().describe("The post ID in the format page-id_post-id."),
    actions: z
      .array(PostAction)
      .optional()
      .describe("A list of available actions on the post."),
    admin_creator: IdNameObject.extend({
      namespace: z.string().optional(),
    })
      .optional()
      .describe("The admin who created the post."),
    application: IdNameObject.optional().describe(
      "The application that created the post.",
    ),
    attachments: z
      .object({
        data: z.array(PostAttachment),
      })
      .optional(),
    call_to_action: z
      .any()
      .optional()
      .describe("A call-to-action button on the post."),
    created_time: z
      .string()
      .datetime()
      .describe("The time the post was created, in ISO 8601 format."),
    from: IdNameObject.optional().describe("The Page that created the post."),
    full_picture: z
      .string()
      .url()
      .optional()
      .describe("URL to the full-sized image of the post."),
    icon: z
      .string()
      .url()
      .optional()
      .describe("A URL to an icon representing the post type."),
    is_app_share: z
      .boolean()
      .optional()
      .describe("Whether the post is a share from an app."),
    is_expired: z.boolean().optional().describe("Whether the post is expired."),
    is_hidden: z.boolean().optional().describe("Whether the post is hidden."),
    is_instagram_eligible: z
      .boolean()
      .optional()
      .describe("Whether the post can be promoted on Instagram."),
    is_published: z
      .boolean()
      .optional()
      .describe("Whether the post is published and visible."),
    is_spherical: z
      .boolean()
      .optional()
      .describe("Whether the post contains a 360-degree photo or video."),
    link: z
      .string()
      .url()
      .optional()
      .describe("The link attached to the post."),
    message: z
      .string()
      .optional()
      .describe("The main text or status message of the post."),
    message_tags: z
      .array(
        IdNameObject.extend({
          length: z.number(),
          offset: z.number(),
          type: z.string(),
        }),
      )
      .optional()
      .describe("Profiles tagged in the message."),
    name: z
      .string()
      .optional()
      .describe("The name of the link, picture, or video in the post."),
    object_id: z
      .string()
      .optional()
      .describe(
        "The ID of any photo, video, or other object attached to the post.",
      ),
    parent_id: z
      .string()
      .optional()
      .describe("The ID of the parent post, if this post is a share."),
    permalink_url: z
      .string()
      .url()
      .describe("The permanent URL to the post on Facebook."),
    picture: z
      .string()
      .url()
      .optional()
      .describe("URL to a thumbnail-sized image of the post."),
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
      .describe("The location tagged in the post."),
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
      .describe("The privacy settings for the post."),
    properties: z
      .array(
        z.object({
          name: z.string(),
          text: z.string(),
        }),
      )
      .optional()
      .describe(
        "A list of properties for an attachment, such as in a link share.",
      ),
    shares: z
      .object({
        count: z.number().int().default(0),
      })
      .optional()
      .describe("The number of times the post has been shared."),
    source: z
      .string()
      .url()
      .optional()
      .describe("A URL to the raw video or photo file."),
    status_type: z
      .string()
      .optional()
      .describe("Indicates the type of activity that generated the post."),
    story: z
      .string()
      .optional()
      .describe("Text that describes the action of publishing the post."),
    story_tags: z
      .array(
        IdNameObject.extend({
          length: z.number(),
          offset: z.number(),
          type: z.string(),
        }),
      )
      .optional()
      .describe("Profiles tagged in the story."),
    subscribed: z
      .boolean()
      .optional()
      .describe(
        "Whether the user who is viewing the post is subscribed to it.",
      ),
    to: z
      .object({
        data: z.array(IdNameObject),
      })
      .optional()
      .describe("Profiles the post is specifically shared with."),
    type: z
      .enum(["link", "status", "photo", "video", "offer"])
      .optional()
      .describe("A string indicating the type of post."),
    updated_time: z
      .string()
      .datetime()
      .describe("The time the post was last updated, in ISO 8601 format."),
    with_tags: z
      .object({
        data: z.array(IdNameObject),
      })
      .optional()
      .describe("Profiles tagged in the post's photo, video, or link."),
  });
}
