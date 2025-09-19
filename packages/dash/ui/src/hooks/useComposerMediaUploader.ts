import type { Restrictions } from "@uppy/core";
import Uppy from "@uppy/core";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { useComposerStore } from "@/stores/composer-store";

interface ComposerMediaUploaderOptions {
  workspaceSlug?: string;
  maxFiles?: number;
  maxImageSize?: number;
  maxVideoSize?: number;
  allowedTypes?: string[];
}

const DEFAULT_CONFIG = {
  maxFiles: 10,
  maxImageSize: 10 * 1024 * 1024, // 10MB
  maxVideoSize: 100 * 1024 * 1024, // 100MB
  allowedTypes: ["image/*", "video/*"],
} satisfies Required<Omit<ComposerMediaUploaderOptions, "workspaceSlug">>;

const buildRestrictions = (
  config: Required<Omit<ComposerMediaUploaderOptions, "workspaceSlug">>,
): Restrictions => ({
  maxNumberOfFiles: config.maxFiles,
  maxFileSize: Math.max(config.maxImageSize, config.maxVideoSize),
  allowedFileTypes: config.allowedTypes,
  minFileSize: null,
  maxTotalFileSize: null,
  minNumberOfFiles: null,
  requiredMetaFields: [],
});

export function useComposerMediaUploader({
  workspaceSlug,
  maxFiles,
  maxImageSize,
  maxVideoSize,
  allowedTypes,
}: ComposerMediaUploaderOptions) {
  const config = useMemo(
    () => ({
      maxFiles: maxFiles ?? DEFAULT_CONFIG.maxFiles,
      maxImageSize: maxImageSize ?? DEFAULT_CONFIG.maxImageSize,
      maxVideoSize: maxVideoSize ?? DEFAULT_CONFIG.maxVideoSize,
      allowedTypes: allowedTypes ?? DEFAULT_CONFIG.allowedTypes,
    }),
    [allowedTypes, maxFiles, maxImageSize, maxVideoSize],
  );

  const restrictions = useMemo(() => buildRestrictions(config), [config]);

  const uploadAttachments = useComposerStore(
    (state) => state.uploadAttachments,
  );
  const attachmentsCount = useComposerStore(
    (state) => state.contentCreateData.base.attachments?.length ?? 0,
  );

  const uppyRef = useRef<Uppy | null>(null);

  useEffect(() => {
    const uppy = new Uppy({
      autoProceed: false,
      restrictions,
    });

    uppyRef.current = uppy;

    uppy.on("files-added", async (files) => {
      if (!workspaceSlug) {
        toast.error("Workspace is required before uploading media");
        uppy.cancelAll();
        return;
      }

      const rawFiles = files
        .map((file) => file.data)
        .filter((file): file is File => file instanceof File);

      if (rawFiles.length === 0) {
        uppy.cancelAll();
        return;
      }

      try {
        await uploadAttachments(rawFiles, workspaceSlug);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Media upload failed";
        toast.error(message);
      } finally {
        uppy.cancelAll();
        uppy.resetProgress();
      }
    });

    uppy.on("restriction-failed", (file, error) => {
      const reason = error?.message ?? "File is not allowed";
      toast.error(`${file?.name}: ${reason}`);
    });

    uppy.on("error", (error) => {
      const message =
        error instanceof Error ? error.message : String(error ?? "Error");
      toast.error(message);
    });

    return () => {
      uppy.cancelAll();
      uppy.destroy();
      uppyRef.current = null;
    };
  }, [restrictions, uploadAttachments, workspaceSlug]);

  const handleFiles = useCallback(
    (files: File[]) => {
      const uppy = uppyRef.current;
      if (!uppy || files.length === 0) {
        return;
      }

      if (!workspaceSlug) {
        toast.error("Select a workspace before uploading media");
        return;
      }

      const remainingSlots = config.maxFiles - attachmentsCount;
      if (remainingSlots <= 0) {
        toast.error("Maximum number of media files reached");
        return;
      }

      const acceptedFiles = files.slice(0, remainingSlots);
      const rejectedCount = files.length - acceptedFiles.length;

      acceptedFiles.forEach((file) => {
        try {
          uppy.addFile({
            name: file.name,
            type: file.type,
            data: file,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "File could not be added";
          toast.error(`${file.name}: ${message}`);
        }
      });

      if (rejectedCount > 0) {
        toast.warning(
          `Only ${remainingSlots} file${remainingSlots === 1 ? "" : "s"} allowed right now`,
        );
      }
    },
    [attachmentsCount, config.maxFiles, workspaceSlug],
  );

  return {
    handleFiles,
    maxFiles: config.maxFiles,
  };
}
