import type { StateCreator } from "zustand";
import { buildNewAttachment } from "../domain/attachments";
import type { ComposerActions, ComposerState } from "../types";

interface AttachmentDraft {
  id: string;
  type: "photo" | "video";
  file?: File;
  mimeType?: string;
  metadata?: Record<string, unknown>;
}

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
      files.forEach((file, index) => {
        state.draft.attachments.push(buildNewAttachment(file, index));
      });
      state.draftVersion++;
    }),
  uploadAttachments: async (files: File[], workspaceSlug: string) => {
    const { apiClient } = await import("@/lib/hono-client");
    const placeholderIds: string[] = [];
    set((state) => {
      files.forEach((file, idx) => {
        const att = buildNewAttachment(file, idx);
        placeholderIds.push(att.id);
        state.draft.attachments.push({
          ...(att as AttachmentDraft),
          metadata: { uploading: true },
        });
      });
      state.draftVersion++;
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
          const att = state.draft.attachments.find((a) => a.id === localId);
          if (att) {
            att.id = imageId;
            (att as AttachmentDraft).metadata = {
              ...((att as AttachmentDraft).metadata || {}),
              cfImageId: imageId,
              uploading: false,
            };
          }
          state.draftVersion++;
        });
      } catch (err) {
        set((state) => {
          const att = state.draft.attachments.find((a) => a.id === localId);
          if (att)
            (att as AttachmentDraft).metadata = {
              ...((att as AttachmentDraft).metadata || {}),
              uploading: false,
              error: (err as Error).message,
            };
          state.draftVersion++;
        });
      }
    }
  },
  removeAttachment: (index: number) =>
    set((state) => {
      state.draft.attachments = state.draft.attachments.filter(
        (_, i) => i !== index,
      );
      state.draftVersion++;
    }),
});
