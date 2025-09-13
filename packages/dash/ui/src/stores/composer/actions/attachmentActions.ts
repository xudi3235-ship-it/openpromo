import type { SharedAttachmentSpec } from "@core/domain/content/schema/placement";
import type { StateCreator } from "zustand";
import type { ComposerActions, ComposerState } from "../types";

export const createAttachmentActions: StateCreator<
  ComposerState & ComposerActions,
  [["zustand/immer", never]],
  [],
  Pick<
    ComposerActions,
    "addAttachments" | "uploadAttachments" | "removeAttachment"
  >
> = (set) => ({
  addAttachments: (files: File[]) =>
    set((state) => {
      const oldBase = state.contentCreateData.base.attachments
        .map((a) => a.id)
        .join("|");
      const newAttachments = files.map((file, index) => ({
        id: `attachment-${Date.now()}-${index}`,
        type: file.type.startsWith("image/")
          ? ("photo" as const)
          : ("video" as const),
        file,
        mimeType: file.type,
      }));
      state.contentCreateData.base.attachments.push(...newAttachments);
      const newBase = state.contentCreateData.base.attachments;
      const shouldSync = (current?: SharedAttachmentSpec[]) =>
        !current || current.map((a) => a.id).join("|") === oldBase;
      state.contentCreateData.placements.facebookFeed?.forEach((spec) => {
        if (shouldSync(spec.postSpec.attachments))
          spec.postSpec.attachments = newBase.map((a) => ({ ...a }));
      });
      state.contentCreateData.placements.instagramFeed?.forEach((spec) => {
        if (shouldSync(spec.attachments))
          spec.attachments = newBase.map((a) => ({ ...a }));
      });
    }),
  uploadAttachments: async (files: File[], workspaceSlug: string) => {
    const { apiClient } = await import("@/lib/hono-client");
    const placeholderIds: string[] = [];
    set((state) => {
      files.forEach((file, idx) => {
        const id = `attachment-${Date.now()}-${idx}`;
        placeholderIds.push(id);
        state.contentCreateData.base.attachments.push({
          id,
          type: file.type.startsWith("image/") ? "photo" : "video",
          file,
          mimeType: file.type,
          metadata: { uploading: true },
        });
      });
      const syncIf = (current?: SharedAttachmentSpec[]) =>
        !current ||
        current.length + files.length ===
          state.contentCreateData.base.attachments.length;
      state.contentCreateData.placements.facebookFeed?.forEach((spec) => {
        if (syncIf(spec.postSpec.attachments))
          spec.postSpec.attachments =
            state.contentCreateData.base.attachments.map((a) => ({ ...a }));
      });
      state.contentCreateData.placements.instagramFeed?.forEach((spec) => {
        if (syncIf(spec.attachments))
          spec.attachments = state.contentCreateData.base.attachments.map(
            (a) => ({ ...a }),
          );
      });
    });
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const localId = placeholderIds[i];
      try {
        const res = await apiClient.workspaces[":workspaceSlug"].media.images[
          "upload-url"
        ].$post({
          param: { workspaceSlug },
          json: { requireSignedURLs: false },
        });
        if (!res.ok) throw new Error("Failed to get upload URL");
        const { id: imageId, uploadURL } = (await res.json()) as {
          id: string;
          uploadURL: string;
        };
        const form = new FormData();
        form.append("file", file, file.name);
        const uploadResp = await fetch(uploadURL, {
          method: "POST",
          body: form,
        });
        if (!uploadResp.ok) throw new Error("Upload failed");
        set((state) => {
          const att = state.contentCreateData.base.attachments.find(
            (a) => a.id === localId,
          );
          if (att) {
            att.id = imageId;
            att.metadata = {
              ...(att.metadata || {}),
              cfImageId: imageId,
              uploading: false,
            };
          }
          const baseIds = state.contentCreateData.base.attachments
            .map((a) => a.id)
            .join("|");
          const syncIf = (current?: SharedAttachmentSpec[]) =>
            !current ||
            current.map((x) => x.id).every((id) => baseIds.includes(id));
          state.contentCreateData.placements.facebookFeed?.forEach((spec) => {
            if (syncIf(spec.postSpec.attachments))
              spec.postSpec.attachments =
                state.contentCreateData.base.attachments.map((a) => ({ ...a }));
          });
          state.contentCreateData.placements.instagramFeed?.forEach((spec) => {
            if (syncIf(spec.attachments))
              spec.attachments = state.contentCreateData.base.attachments.map(
                (a) => ({ ...a }),
              );
          });
        });
      } catch (err) {
        set((state) => {
          const att = state.contentCreateData.base.attachments.find(
            (a) => a.id === localId,
          );
          if (att)
            att.metadata = {
              ...(att.metadata || {}),
              uploading: false,
              error: (err as Error).message,
            };
        });
      }
    }
  },
  removeAttachment: (index: number) =>
    set((state) => {
      const oldIds = state.contentCreateData.base.attachments
        .map((a) => a.id)
        .join("|");
      state.contentCreateData.base.attachments =
        state.contentCreateData.base.attachments.filter((_, i) => i !== index);
      const newBase = state.contentCreateData.base.attachments;
      const wasSynced = (current?: SharedAttachmentSpec[]) =>
        !current || current.map((a) => a.id).join("|") === oldIds;
      state.contentCreateData.placements.facebookFeed?.forEach((spec) => {
        if (wasSynced(spec.postSpec.attachments))
          spec.postSpec.attachments = newBase.map((a) => ({ ...a }));
      });
      state.contentCreateData.placements.instagramFeed?.forEach((spec) => {
        if (wasSynced(spec.attachments))
          spec.attachments = newBase.map((a) => ({ ...a }));
      });
    }),
});
