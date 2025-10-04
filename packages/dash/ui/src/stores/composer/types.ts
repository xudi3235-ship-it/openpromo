import type { Platform } from "@core/schemas/connected-account.sql";
import type {
  AllPlacement,
  FBFeedPlacementSpec,
  IGFeedPlacementSpec,
  SharedAttachmentSpec,
  TikTokFeedPlacementSpec,
} from "@shared/content";
import type { ContentCreateData } from "@worker/routes/api/workspaces/content";
import type { ConnectedAccount } from "@/lib/hono-client";

export interface ValidationError {
  type:
    | "no_accounts"
    | "no_message"
    | "no_media"
    | "invalid_scheduling"
    | "upload_pending"
    | "upload_failed"
    | "platform_limit_exceeded";
  message: string;
  severity: "error" | "warning";
  field?: string;
}

export interface ValidationState {
  isValid: boolean;
  errors: ValidationError[];
  canPublish: boolean;
}

export interface ComposerProps {
  initialAccounts?: ConnectedAccount[];
  initialPlacementSelected?: AllPlacement | "ALL";
  initialSelectedPreview?: Platform;
  initialMessage?: string;
  initContentCreateData?: ContentCreateData;
  contentGroupID?: string;
}

export interface ComposerState {
  placementSelected: AllPlacement | "ALL";
  selectedPreview: Platform;
  accounts: ConnectedAccount[];
  selectedAccounts: string[];
  activeAccount: string | null;
  contentCreateData: ContentCreateData;
  contentGroupID: string | null;
  validation: ValidationState;
  initialSnapshot: {
    message: string;
    attachments: SharedAttachmentSpec[];
    selectedAccounts: string[];
    placements: ContentCreateData["placements"];
  };
}

export interface ComposerActions {
  setSelectedPreview: (platform: Platform) => void;
  setMessage: (message: string) => void;
  getCurrentMessage: () => string;
  setCurrentMessage: (message: string) => void;
  setSelectedAccounts: (accountIds: string[]) => void;
  setActiveAccount: (accountId: string | null) => void;
  addAttachments: (files: File[]) => void;
  removeAttachment: (index: number) => void;
  updateAttachment: (
    index: number,
    updates: Partial<SharedAttachmentSpec>,
  ) => void;
  clearAttachments: () => void;
  uploadAttachments: (files: File[], workspaceSlug: string) => Promise<void>;
  reorderAttachments: (fromIndex: number, toIndex: number) => void;
  setPublishingStatus: (
    status: ContentCreateData["base"]["publishingStatus"],
    schedulingSpec?: ContentCreateData["base"]["schedulingSpec"],
  ) => void;
  setSchedulingSpec: (
    schedulingSpec?: ContentCreateData["base"]["schedulingSpec"],
  ) => void;
  hasUnsavedChanges: () => boolean;
}

export type ComposerStore = ComposerState & ComposerActions;

export type PlacementSpecUpdater = {
  facebook?: (spec: FBFeedPlacementSpec) => void;
  instagram?: (spec: IGFeedPlacementSpec) => void;
  tiktok?: (spec: TikTokFeedPlacementSpec) => void;
};
