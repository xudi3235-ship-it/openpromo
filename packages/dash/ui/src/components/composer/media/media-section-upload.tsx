import { cn } from "@openpromo/ui/lib/utils";
import { Upload } from "lucide-react";
import { useMemo } from "react";
import { Dropzone } from "@/components/dropzone";
import { useComposerMediaUploader } from "@/hooks/useComposerMediaUploader";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useComposerStore } from "@/stores/composer-store";
import { useMediaUIStore } from "@/stores/media-ui-store";
import { MEDIA_CONFIG } from "./media-section-config";

function MediaSectionUpload() {
  const { workspace } = useWorkspace();
  const { contentCreateData } = useComposerStore();
  const { viewMode } = useMediaUIStore();

  const attachments = useMemo(
    () => contentCreateData.base.attachments ?? [],
    [contentCreateData.base.attachments],
  );

  const { handleFiles } = useComposerMediaUploader({
    workspaceSlug: workspace?.slug,
    maxFiles: MEDIA_CONFIG.maxFiles,
    maxImageSize: MEDIA_CONFIG.maxImageSize,
    maxVideoSize: MEDIA_CONFIG.maxVideoSize,
  });

  const isAtLimit = attachments.length >= MEDIA_CONFIG.maxFiles;
  const remainingSlots = Math.max(
    MEDIA_CONFIG.maxFiles - attachments.length,
    0,
  );

  const isCompact = viewMode === "compact";
  const dropzoneSizing = isCompact
    ? attachments.length === 0
      ? "flex-1 min-h-[168px]"
      : "h-20 w-20 flex-shrink-0"
    : "w-full min-h-[200px]";
  const compactHasItems = isCompact && attachments.length > 0;
  const showRemainingNotice =
    !isAtLimit && (!isCompact || attachments.length === 0);
  const uploadIconClass = compactHasItems ? "h-4 w-4" : "h-6 w-6";

  return (
    <Dropzone
      accept={{ "image/*": [], "video/*": [] }}
      maxFiles={Math.max(remainingSlots, 1)}
      maxSize={Math.max(MEDIA_CONFIG.maxVideoSize, MEDIA_CONFIG.maxImageSize)}
      onDrop={handleFiles}
      disabled={isAtLimit}
      className={cn(
        dropzoneSizing,
        "group/dropzone relative flex items-center justify-center rounded-lg border border-dashed border-border/60 bg-transparent p-4 text-muted-foreground transition-colors hover:border-primary/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
        isCompact && "px-3 py-2",
        isAtLimit && "cursor-not-allowed border-border/40 opacity-60",
      )}
    >
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center">
        <Upload className={cn(uploadIconClass, "text-muted-foreground/70")} />
        {isCompact ? (
          attachments.length === 0 ? (
            <span className="text-xs font-medium text-foreground/80">
              Drop files or tap to upload
            </span>
          ) : (
            <span className="text-[11px] font-medium text-foreground/80">
              {isAtLimit ? "Max reached" : "Add media"}
            </span>
          )
        ) : (
          <p className="text-sm font-semibold text-foreground/80">
            Share photos and videos
          </p>
        )}
        {showRemainingNotice && (
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
            {remainingSlots} slot{remainingSlots === 1 ? "" : "s"} left
          </span>
        )}
      </div>
    </Dropzone>
  );
}

export { MediaSectionUpload };
