import { z } from "zod";

export namespace PhotoSchema {
  const IdNameObject = z.object({
    id: z.string(),
    name: z.string().optional(),
  });

  const PhotoImageSchema = z.object({
    height: z.number().int(),
    source: z.string().url(),
    width: z.number().int(),
  });

  export const Schema = z.object({
    id: z.string().describe("The photo ID."),
    album: z
      .object({
        id: z.string(),
        name: z.string().optional(),
        created_time: z.string().datetime().optional(),
      })
      .optional()
      .describe("The album this photo is in."),
    alt_text: z
      .string()
      .optional()
      .describe("The automatically generated alternative text for the photo."),
    alt_text_custom: z
      .string()
      .optional()
      .describe("The user-provided alternative text for the photo."),
    created_time: z
      .string()
      .datetime()
      .describe("The time the photo was published."),
    event: IdNameObject.optional().describe(
      "The event this photo is related to.",
    ),
    from: IdNameObject.optional().describe(
      "The profile (user or page) that uploaded the photo.",
    ),
    height: z
      .number()
      .int()
      .optional()
      .describe("The height of the photo in pixels."),
    icon: z
      .string()
      .url()
      .optional()
      .describe("The icon representing the photo type."),
    images: z
      .array(PhotoImageSchema)
      .optional()
      .describe("The different stored representations of the photo."),
    link: z
      .string()
      .url()
      .optional()
      .describe("A link to the photo on Facebook."),
    name: z
      .string()
      .optional()
      .describe("The user-provided caption for the photo."),
    name_tags: z
      .array(
        IdNameObject.extend({
          length: z.number(),
          offset: z.number(),
          type: z.string(),
        }),
      )
      .optional()
      .describe("Profiles tagged in the photo's caption."),
    page_story_id: z
      .string()
      .optional()
      .describe("The ID of the page story associated with this photo."),
    picture: z
      .string()
      .url()
      .optional()
      .describe("URL to a thumbnail-sized version of the photo."),
    place: z
      .object({
        id: z.string(),
        name: z.string(),
        location: z
          .object({
            latitude: z.number().optional(),
            longitude: z.number().optional(),
          })
          .optional(),
      })
      .optional()
      .describe("The location associated with the photo."),
    target: IdNameObject.optional().describe(
      "The target (like a page or user) this photo is published to.",
    ),
    updated_time: z
      .string()
      .datetime()
      .describe("The last time the photo or its caption was updated."),
    webp_images: z
      .array(PhotoImageSchema)
      .optional()
      .describe(
        "The different stored representations of the photo in WebP format.",
      ),
    width: z
      .number()
      .int()
      .optional()
      .describe("The width of the photo in pixels."),
  });
}
