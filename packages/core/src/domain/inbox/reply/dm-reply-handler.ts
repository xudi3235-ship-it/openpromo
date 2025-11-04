import { ErrorCodes, VisibleError } from "@core/utils/error";
import { FacebookReply } from "./facebook-reply";
import { InstagramReply } from "./instagram-reply";
import type { DMReplyContext, DMReplyPayload } from "./types";

/**
 * Handles sending DM replies across platforms
 */
export namespace DMReplyHandler {
  export async function send(context: DMReplyContext, payload: DMReplyPayload) {
    switch (context.platform) {
      case "FACEBOOK":
        await FacebookReply.sendDM(context, payload);
        break;

      case "INSTAGRAM":
        await InstagramReply.sendDM(context, payload);
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
