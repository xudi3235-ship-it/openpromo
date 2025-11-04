import type { InboxAttachment, InboxConversationSummary } from "@shared/inbox";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useStorageUpload } from "@/hooks/useStorageUpload";

export type ComposerAttachment = {
  id: string;
  name?: string;
  data: InboxAttachment;
};

function generateId(prefix: string) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useAttachmentComposer(
  conversation: InboxConversationSummary | null,
) {
  const { uploadFile } = useStorageUpload();
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetFileInput = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments([]);
    resetFileInput();
  }, [resetFileInput]);

  const restoreAttachments = useCallback(
    (items: InboxAttachment[]) => {
      if (!items.length) {
        clearAttachments();
        return;
      }

      setAttachments(
        items.map((data, index) => ({
          id: generateId(`restore-${index}`),
          data,
        })),
      );
      resetFileInput();
    },
    [clearAttachments, resetFileInput],
  );

  const handleFileChange = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      if (!conversation) {
        toast.error("Select a conversation before attaching media");
        resetFileInput();
        return;
      }

      if (attachments.length >= 1) {
        toast.info("You can attach one image per message for now");
        resetFileInput();
        return;
      }

      const file = files[0];
      if (!file.type.startsWith("image/")) {
        toast.error("Only image attachments are supported right now");
        resetFileInput();
        return;
      }

      try {
        setIsUploading(true);
        const { publicUrl } = await uploadFile(file);
        if (!publicUrl) {
          throw new Error("Upload did not return a public URL");
        }

        setAttachments([
          {
            id: generateId("attachment"),
            name: file.name,
            data: {
              type: "image",
              url: publicUrl,
            },
          },
        ]);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to upload image";
        toast.error(message);
      } finally {
        setIsUploading(false);
        resetFileInput();
      }
    },
    [attachments.length, conversation, resetFileInput, uploadFile],
  );

  const removeAttachment = useCallback(() => {
    clearAttachments();
  }, [clearAttachments]);

  const handleAttachmentButtonClick = useCallback(() => {
    if (!conversation) {
      toast.error("Select a conversation before attaching media");
      return;
    }

    if (isUploading) return;

    if (attachments.length >= 1) {
      toast.info("You can attach one image per message for now");
      return;
    }

    fileInputRef.current?.click();
  }, [attachments.length, conversation, isUploading]);

  const hasAttachments = useMemo(() => attachments.length > 0, [attachments]);

  return {
    attachments,
    hasAttachments,
    isUploading,
    fileInputRef,
    handleFileChange,
    handleAttachmentButtonClick,
    removeAttachment,
    clearAttachments,
    restoreAttachments,
  };
}
