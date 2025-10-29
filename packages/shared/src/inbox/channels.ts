import * as z from "zod";

export const InboxChannel = z.enum(["dm", "post_comment"]);
export type InboxChannel = z.infer<typeof InboxChannel>;
