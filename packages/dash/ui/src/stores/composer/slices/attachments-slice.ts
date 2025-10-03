import type { SharedAttachmentSpec } from "@shared/content";
import { MediaService } from "@/lib/media";
import {
  processUploadResults,
  uploadAttachments as uploadAttachmentsService,
} from "@/services/attachment-upload";
import { syncToNonCustomizedPlacements } from "../utils/placements";
import { recalculateValidation } from "../utils/validation";
import type { ComposerSlice } from "./types";

export const createAttachmentsSlice: ComposerSlice<{
  addAttachments: (files: File[]) => void;
  removeAttachment: (index: number) => void;
  updateAttachment: (
    index: number,
    updates: Partial<SharedAttachmentSpec>,
  ) => void;
  clearAttachments: () => void;
  uploadAttachments: (files: File[], workspaceSlug: string) => Promise<void>;
  reorderAttachments: (fromIndex: number, toIndex: number) => void;
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
    }),
});
