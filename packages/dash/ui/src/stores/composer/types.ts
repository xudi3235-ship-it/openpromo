import type {
  AllPlacement,
  FBFeedPlacementSpec,
  IGFeedPlacementSpec,
  SharedAttachmentSpec,
} from "@core/domain/content/schema/placement";
import type { Platform } from "@core/schemas/connected-account.sql";
import type { ContentCreateData } from "@worker/routes/api/workspaces/content";
import type { ConnectedAccount } from "@/lib/hono-client";
import type { ComposerDraft } from "./domain/draft";

export interface ComposerProps {
  initialAccounts?: ConnectedAccount[];
  initialPlacementSelected?: AllPlacement | "ALL";
  initialSelectedPreview?: Platform;
  initialMessage?: string;
}

export interface ComposerState {
  placementSelected: AllPlacement | "ALL";
  // Derived variant of contentCreateData (read-only convenience, computed on demand)
  readonly contentCreateDataDerived: ContentCreateData;
  // Normalized draft representation (single source of truth)
  draft: ComposerDraft;
  // Incremented anytime draft mutates; used to invalidate derived memo
  draftVersion: number;
  // internal memoization slots (not for external use)
  _cachedContentVersion: number;
  _cachedContentCreateData?: ContentCreateData;
  selectedPreview: Platform;
  accountsMap: Map<string, ConnectedAccount>;
  accounts: ConnectedAccount[];
  selectedAccounts: string[];
}

export interface ComposerActions {
  setPlacementSpecs: (specs: {
    base?: { attachments?: SharedAttachmentSpec[]; message?: string };
    facebookFeed?: FBFeedPlacementSpec[];
    instagramFeed?: IGFeedPlacementSpec[];
  }) => void;
  updateBaseMessage: (message: string) => void;
  overridePlacementMessage: (
    placement: "FB_FEED" | "IG_FEED",
    connectedAccountID: string,
    message: string,
  ) => void;
  resetPlacementMessage: (
    placement: "FB_FEED" | "IG_FEED",
    connectedAccountID: string,
  ) => void;
  toggleAccount: (accountId: string) => void;
  toggleAllAccounts: () => void;
  setAccounts: (accounts: ConnectedAccount[]) => void;
  addAttachments: (files: File[]) => void;
  uploadAttachments: (files: File[], workspaceSlug: string) => Promise<void>;
  removeAttachment: (index: number) => void;
  setSelectedPreview: (preview: Platform) => void;
  _getAccounts: () => ConnectedAccount[];
  _getSelectedAccounts: () => string[];
}

export type ComposerStore = ComposerState & ComposerActions;
