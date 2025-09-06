import * as z from "zod";

export namespace IGUserSchema {
  // The main Zod schema for a Shadow Instagram User object.
  export const Schema = z.object({
    id: z.string().describe("The user's Instagram ID."),
    biography: z.string().optional().describe("The user's biography."),
    followers_count: z
      .int()
      .optional()
      .describe("The number of followers the user has."),
    following_count: z
      .int()
      .optional()
      .describe("The number of users this user is following."),
    media_count: z
      .int()
      .optional()
      .describe("The number of media objects on the user's profile."),
    name: z.string().optional().describe("The user's full name."),
    profile_picture_url: z
      .url()
      .optional()
      .describe("The URL for the user's profile picture."),
    username: z.string().describe("The user's username."),
    website: z.url().optional().describe("The user's website URL."),
  });
}
