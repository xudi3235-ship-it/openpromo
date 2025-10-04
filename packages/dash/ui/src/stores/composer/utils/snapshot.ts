import type { ContentCreateData } from "@worker/routes/api/workspaces/content";
import type { ComposerState } from "../types";

export const createSnapshot = (
  contentCreateData: ContentCreateData,
  selectedAccounts: string[],
): ComposerState["initialSnapshot"] => {
  return {
    message: contentCreateData.base.message || "",
    attachments: structuredClone(contentCreateData.base.attachments || []),
    selectedAccounts: [...selectedAccounts],
    placements: structuredClone(contentCreateData.placements),
  };
};

export const createInitialSnapshot = createSnapshot;

export const hasSnapshotChanged = (
  initial: ComposerState["initialSnapshot"],
  current: ComposerState["initialSnapshot"],
): boolean => {
  return JSON.stringify(initial) !== JSON.stringify(current);
};
