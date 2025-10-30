import { ErrorCodes, VisibleError } from "@core/utils/error";
import { FacebookReply } from "./facebook-reply";
import { InstagramReply } from "./instagram-reply";
import type { DMReplyContext } from "./types";

/**
 * Handles sending DM replies across platforms
 */
export namespace DMReplyHandler {
  export async function send(context: DMReplyContext, text: string) {
    switch (context.platform) {
      case "FACEBOOK":
        await FacebookReply.sendDM(context, text);
        break;

      case "INSTAGRAM":
        await InstagramReply.sendDM(context, text);
        break;

      default:
        throw new VisibleError(
          "validation",
          ErrorCodes.Validation.INVALID_STATE,
          `Unsupported DM platform: ${context.platform}`,
        );
    }
  }
}
