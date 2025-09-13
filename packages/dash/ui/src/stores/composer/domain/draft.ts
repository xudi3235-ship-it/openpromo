import type {
  FBFeedPlacementSpec,
  IGFeedPlacementSpec,
  SharedAttachmentSpec,
} from "@core/domain/content/schema/placement";
import type { ContentCreateData } from "@worker/routes/api/workspaces/content";
import type { ConnectedAccount } from "@/lib/hono-client";
import { buildFBSpec, buildIGSpec } from "./placements";

export interface ComposerDraft {
  message: string;
  attachments: SharedAttachmentSpec[]; // local ids until uploaded
  selectedAccountIds: string[];
  // sparse overrides keyed by `${placement}:${accountId}`
  messageOverrides: Record<string, string>;
  // future: attachment overrides, scheduling, etc.
}

export function createInitialDraft(message: string): ComposerDraft {
  return {
    message,
    attachments: [],
    selectedAccountIds: [],
    messageOverrides: {},
  };
}

export function buildContentFromDraft(
  draft: ComposerDraft,
  accounts: Map<string, ConnectedAccount>,
): ContentCreateData {
  const selectedAccounts = draft.selectedAccountIds
    .map((id) => accounts.get(id))
    .filter(Boolean) as ConnectedAccount[];

  const fb = selectedAccounts
    .filter((a) => a.platform === "FACEBOOK")
    .map((acc) =>
      applyMessageOverride(
        buildFBSpec(acc, draft.message, draft.attachments),
        draft,
        "FB_FEED",
        acc.id,
      ),
    );
  const ig = selectedAccounts
    .filter((a) => a.platform === "INSTAGRAM")
    .map((acc) =>
      applyMessageOverride(
        buildIGSpec(acc, draft.message, draft.attachments),
        draft,
        "IG_FEED",
        acc.id,
      ),
    );

  return {
    base: {
      publishingStatus: "PUBLISH_NOW",
      message: draft.message,
      attachments: draft.attachments.map((a) => ({ ...a })),
    },
    placements: { facebookFeed: fb, instagramFeed: ig },
  } as ContentCreateData;
}

type AnyPlacementSpec = FBFeedPlacementSpec | IGFeedPlacementSpec;

function applyMessageOverride(
  spec: AnyPlacementSpec,
  draft: ComposerDraft,
  placement: "FB_FEED" | "IG_FEED",
  accountId: string,
): AnyPlacementSpec {
  const key = `${placement}:${accountId}`;
  const override = draft.messageOverrides[key];
  if (!override) return spec;
  if (placement === "FB_FEED" && spec.placement === "FB_FEED") {
    spec.postSpec.message = override;
  } else if (placement === "IG_FEED" && spec.placement === "IG_FEED") {
    spec.caption = override;
  }
  return spec;
}

export function setMessageOverride(
  draft: ComposerDraft,
  placement: "FB_FEED" | "IG_FEED",
  accountId: string,
  value: string | null,
) {
  const key = `${placement}:${accountId}`;
  if (value == null) delete draft.messageOverrides[key];
  else draft.messageOverrides[key] = value;
}

export interface DraftValidationIssue {
  code: "NO_ACCOUNTS" | "EMPTY_MESSAGE" | "ATTACHMENT_UPLOAD_PENDING";
  message: string;
  meta?: Record<string, unknown>;
}

export function validateDraft(draft: ComposerDraft): DraftValidationIssue[] {
  const issues: DraftValidationIssue[] = [];
  if (draft.selectedAccountIds.length === 0) {
    issues.push({ code: "NO_ACCOUNTS", message: "No accounts selected." });
  }
  if (!draft.message.trim()) {
    issues.push({ code: "EMPTY_MESSAGE", message: "Message is empty." });
  }
  const pending = draft.attachments.filter(
    (a: { metadata?: { uploading?: boolean } }) => a?.metadata?.uploading,
  ).length;
  if (pending > 0) {
    issues.push({
      code: "ATTACHMENT_UPLOAD_PENDING",
      message: `${pending} attachment(s) still uploading`,
      meta: { pending },
    });
  }
  return issues;
}

export function finalizeDraft(
  draft: ComposerDraft,
  accountsMap: Map<string, ConnectedAccount>,
): { data: ContentCreateData; issues: DraftValidationIssue[] } {
  const issues = validateDraft(draft);
  const data = buildContentFromDraft(draft, accountsMap);
  return { data, issues };
}
