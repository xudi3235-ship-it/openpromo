import type {
  FBFeedPlacementSpec,
  IGFeedPlacementSpec,
  SharedAttachmentSpec,
} from "@core/domain/content/schema/placement";
import type {
  FBPageMetadata,
  IGAccountMetadata,
} from "@core/schemas/connected-account.sql";
import type { ConnectedAccount } from "@/lib/hono-client";

export function buildFBSpec(
  account: ConnectedAccount,
  message: string,
  attachments: SharedAttachmentSpec[],
): FBFeedPlacementSpec {
  return {
    identity: {
      connectedAccountID: account.id,
      fbPageID: (account.metadata as FBPageMetadata).pageID,
    },
    placement: "FB_FEED",
    postSpec: { message, attachments: attachments.map((a) => ({ ...a })) },
  } as FBFeedPlacementSpec;
}

export function buildIGSpec(
  account: ConnectedAccount,
  message: string,
  attachments: SharedAttachmentSpec[],
): IGFeedPlacementSpec {
  return {
    identity: {
      connectedAccountID: account.id,
      igAccountID: (account.metadata as IGAccountMetadata).igAccountID,
    },
    placement: "IG_FEED",
    caption: message,
    attachments: attachments.map((a) => ({ ...a })),
  } as IGFeedPlacementSpec;
}

export function cloneAttachments<T extends SharedAttachmentSpec>(
  atts?: T[],
): T[] | undefined {
  return atts?.map((a) => ({ ...a })) as T[] | undefined;
}
