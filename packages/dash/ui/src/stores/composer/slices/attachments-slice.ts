import type {
  FBFeedPlacementSpec,
  IGFeedPlacementSpec,
  SharedAttachmentSpec,
  TikTokFeedPlacementSpec,
} from "@shared/content";
import { MediaService } from "@/lib/media";
import {
  processUploadResults,
  uploadAttachments as uploadAttachmentsService,
} from "@/services/attachment-upload";
import {
  rebuildPlacementsFromRegistry,
  resetPlacementEntryToBase,
  syncToNonCustomizedPlacements,
  updatePlacementEntry,
} from "../utils/placements";
import { recalculateValidation } from "../utils/validation";
import type { ComposerSlice } from "./types";

const cloneAttachments = (attachments: SharedAttachmentSpec[]) =>
  attachments.map((attachment) => ({
    ...attachment,
    metadata: attachment.metadata ? { ...attachment.metadata } : undefined,
  }));

export const createAttachmentsSlice: ComposerSlice<{
  addAttachments: (files: File[]) => void;
  addAttachmentSpecs: (specs: SharedAttachmentSpec[]) => void;
  removeAttachment: (index: number) => void;
  updateAttachment: (
    index: number,
    updates: Partial<SharedAttachmentSpec>,
  ) => void;
  clearAttachments: () => void;
  uploadAttachments: (files: File[], workspaceSlug: string) => Promise<void>;
  reorderAttachments: (fromIndex: number, toIndex: number) => void;
  setPlacementAttachments: (
    accountId: string,
    attachments: SharedAttachmentSpec[],
  ) => void;
  resetPlacementCustomization: (accountId: string) => void;
}> = (set, get) => ({
  addAttachments: (files) =>
    set((state) => {
      const newAttachments = files.map((file, index) => ({
        id: `temp-${Date.now()}-${Math.random().toString(36).substring(2)}-${index}`,
        type: file.type.startsWith("video/")
          ? ("video" as const)
          : ("photo" as const),
        file,
        mimeType: file.type,
        metadata: { uploading: true },
      }));

      state.contentCreateData.base.attachments?.push(...newAttachments);

      const baseAttachments = [
        ...(state.contentCreateData.base.attachments ?? []),
      ];

      syncToNonCustomizedPlacements(state, {
        facebook: (spec) => {
          spec.attachments = baseAttachments;
        },
        instagram: (spec) => {
          spec.attachments = baseAttachments;
        },
        tiktok: (spec) => {
          spec.attachments = baseAttachments;
        },
      });

      recalculateValidation(state);
      rebuildPlacementsFromRegistry(state);
    }),
  addAttachmentSpecs: (specs) =>
    set((state) => {
      // Directly add pre-built attachment specs (e.g., from generated images)
      state.contentCreateData.base.attachments?.push(...specs);

      const baseAttachments = [
        ...(state.contentCreateData.base.attachments ?? []),
      ];

      syncToNonCustomizedPlacements(state, {
        facebook: (spec) => {
          spec.attachments = baseAttachments;
        },
        instagram: (spec) => {
          spec.attachments = baseAttachments;
        },
        tiktok: (spec) => {
          spec.attachments = baseAttachments;
        },
      });

      recalculateValidation(state);
      rebuildPlacementsFromRegistry(state);
    }),
  removeAttachment: (index) =>
    set((state) => {
      state.contentCreateData.base.attachments?.splice(index, 1);

      const baseAttachments = [
        ...(state.contentCreateData.base.attachments ?? []),
      ];

      syncToNonCustomizedPlacements(state, {
        facebook: (spec) => {
          spec.attachments = baseAttachments;
        },
        instagram: (spec) => {
          spec.attachments = baseAttachments;
        },
        tiktok: (spec) => {
          spec.attachments = baseAttachments;
        },
      });

      recalculateValidation(state);
      rebuildPlacementsFromRegistry(state);
    }),
  updateAttachment: (index, updates) =>
    set((state) => {
      const attachment = state.contentCreateData.base.attachments?.[index];
      if (attachment) {
        Object.assign(attachment, updates);
      }

      const baseAttachments = [
        ...(state.contentCreateData.base.attachments ?? []),
      ];

      syncToNonCustomizedPlacements(state, {
        facebook: (spec) => {
          spec.attachments = baseAttachments;
        },
        instagram: (spec) => {
          spec.attachments = baseAttachments;
        },
        tiktok: (spec) => {
          spec.attachments = baseAttachments;
        },
      });

      recalculateValidation(state);
      rebuildPlacementsFromRegistry(state);
    }),
  clearAttachments: () =>
    set((state) => {
      state.contentCreateData.base.attachments = [];

      syncToNonCustomizedPlacements(state, {
        facebook: (spec) => {
          spec.attachments = [];
        },
        instagram: (spec) => {
          spec.attachments = [];
        },
        tiktok: (spec) => {
          spec.attachments = [];
        },
      });

      recalculateValidation(state);
      rebuildPlacementsFromRegistry(state);
    }),
  uploadAttachments: async (files, workspaceSlug) => {
    const startingIndex = get().contentCreateData.base.attachments?.length ?? 0;

    const { validFiles, errors } = MediaService.validateFiles(files);

    if (errors.length > 0) {
      console.error("File validation errors:", errors);
      return;
    }

    set((state) => {
      const mediaItems = MediaService.fromFiles(validFiles);
      const newAttachments = MediaService.toAttachmentSpecs(mediaItems);

      newAttachments.forEach((att) => {
        if (!att.metadata) att.metadata = {};
        att.metadata.uploading = true;
      });

      state.contentCreateData.base.attachments?.push(...newAttachments);

      const baseAttachments = [
        ...(state.contentCreateData.base.attachments ?? []),
      ];

      syncToNonCustomizedPlacements(state, {
        facebook: (spec) => {
          spec.attachments = baseAttachments;
        },
        instagram: (spec) => {
          spec.attachments = baseAttachments;
        },
        tiktok: (spec) => {
          spec.attachments = baseAttachments;
        },
      });

      recalculateValidation(state);
      rebuildPlacementsFromRegistry(state);
    });

    const results = await uploadAttachmentsService(
      validFiles,
      workspaceSlug,
      startingIndex,
    );

    processUploadResults(results, (index, updates, meta) => {
      set((state) => {
        const attachment = state.contentCreateData.base.attachments?.[index];
        if (!attachment) return;
        Object.assign(attachment, updates);
        if (!attachment.metadata) {
          attachment.metadata = {};
        }
        Object.assign(attachment.metadata, meta);
      });
    });

    set((state) => {
      const baseAttachments = [
        ...(state.contentCreateData.base.attachments ?? []),
      ];

      const thumbnailUrl = MediaService.getFirstThumbnail(baseAttachments);

      syncToNonCustomizedPlacements(state, {
        facebook: (spec) => {
          spec.attachments = baseAttachments;
          if (thumbnailUrl && !spec.customized) {
            spec.thumbnailUrl = thumbnailUrl;
          }
        },
        instagram: (spec) => {
          spec.attachments = baseAttachments;
          if (thumbnailUrl && !spec.customized) {
            spec.thumbnailUrl = thumbnailUrl;
          }
        },
        tiktok: (spec) => {
          spec.attachments = baseAttachments;
          if (thumbnailUrl && !spec.customized) {
            spec.thumbnailUrl = thumbnailUrl;
          }
        },
      });

      recalculateValidation(state);
      rebuildPlacementsFromRegistry(state);
    });
  },
  reorderAttachments: (fromIndex, toIndex) =>
    set((state) => {
      const attachments = state.contentCreateData.base.attachments;
      if (!attachments || fromIndex === toIndex) return;

      const [removed] = attachments.splice(fromIndex, 1);
      attachments.splice(toIndex, 0, removed);

      const reorderedAttachments = [...attachments];

      syncToNonCustomizedPlacements(state, {
        facebook: (spec) => {
          spec.attachments = reorderedAttachments;
        },
        instagram: (spec) => {
          spec.attachments = reorderedAttachments;
        },
        tiktok: (spec) => {
          spec.attachments = reorderedAttachments;
        },
      });
      recalculateValidation(state);
      rebuildPlacementsFromRegistry(state);
    }),
  setPlacementAttachments: (accountId, attachments) =>
    set((state) => {
      if (!accountId) return;
      const cloned = cloneAttachments(attachments);
      const thumbnailUrl = MediaService.getFirstThumbnail(cloned);

      const entry = updatePlacementEntry(
        state,
        accountId,
        (current) => {
          if (current.platform === "FACEBOOK") {
            const spec = current.spec as FBFeedPlacementSpec;
            spec.attachments = cloned;
            if (thumbnailUrl) {
              spec.thumbnailUrl = thumbnailUrl;
            }
          } else if (current.platform === "INSTAGRAM") {
            const spec = current.spec as IGFeedPlacementSpec;
            spec.attachments = cloned;
            if (thumbnailUrl) {
              spec.thumbnailUrl = thumbnailUrl;
            }
          } else if (current.platform === "TIKTOK") {
            const spec = current.spec as TikTokFeedPlacementSpec;
            spec.attachments = cloned;
            if (thumbnailUrl) {
              spec.thumbnailUrl = thumbnailUrl;
            }
          }
        },
        { markCustomized: true },
      );

      if (!entry) return;

      rebuildPlacementsFromRegistry(state);
      recalculateValidation(state);
    }),
  resetPlacementCustomization: (accountId) =>
    set((state) => {
      if (!accountId) return;
      const entry = resetPlacementEntryToBase(state, accountId);
      if (!entry) return;
      rebuildPlacementsFromRegistry(state);
      recalculateValidation(state);
    }),
});
