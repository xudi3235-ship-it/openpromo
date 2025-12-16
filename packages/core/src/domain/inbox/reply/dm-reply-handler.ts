import { FacebookGraphError } from "@core/domain/content/entity/facebook/api";
import { ErrorCodes, VisibleError } from "@core/utils/error";
import { Log } from "@core/utils/log";
import { FacebookReply } from "./facebook-reply";
import { InstagramReply } from "./instagram-reply";
import type { DMReplyContext, DMReplyPayload } from "./types";

const log = Log.create({ namespace: "dm-reply-handler" });

/**
 * Handles sending DM replies across platforms
 */
export namespace DMReplyHandler {
  export async function send(context: DMReplyContext, payload: DMReplyPayload) {
    try {
      switch (context.platform) {
        case "FACEBOOK":
          return await FacebookReply.sendDM(context, payload);

        case "INSTAGRAM":
          return await InstagramReply.sendDM(context, payload);

        default:
          throw new VisibleError(
            "validation",
            ErrorCodes.Validation.INVALID_STATE,
            `Unsupported DM platform: ${context.platform}`,
          );
      }
    } catch (error) {
      if (error instanceof FacebookGraphError && isWindowViolation(error)) {
        log.warn("Meta messaging window violation", {
          platform: context.platform,
          conversationId: context.conversationId,
          connectedAccountId: context.connectedAccountId,
          errorCode: error.code,
          errorMessage: error.message,
        });
        throw new VisibleError(
          "validation",
          ErrorCodes.Validation.INVALID_STATE,
          "Meta will not deliver this message because the recipient is outside the allowed reply window.",
        );
      }
      throw error;
    }
  }
}

function isWindowViolation(error: FacebookGraphError): boolean {
  if (typeof error.code === "number" && error.code === 10) {
    return true;
  }
  const message = error.message.toLowerCase();
  return message.includes("outside") && message.includes("window");
}
