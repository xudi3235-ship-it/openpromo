import { Button } from "@openpromo/ui/components/button";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@openpromo/ui/components/toggle-group";
import { cn } from "@openpromo/ui/lib/utils";
import type { SharedAttachmentSpec } from "@shared/content";
import { LayoutGrid, List, Trash2, Upload } from "lucide-react";
import {
  Children,
  isValidElement,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Dropzone } from "@/components/dropzone";
import { useAttachmentRenderer } from "@/hooks/useAttachmentRenderer";
import { useComposerMediaUploader } from "@/hooks/useComposerMediaUploader";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useComposerStore } from "@/stores/composer-store";
import { useMediaUIStore } from "@/stores/media-ui-store";
import { ConfirmDialog } from "../../confirm-dialog";
import { MediaCompactView } from "./media-compact-view";
import { MediaDetailDialog } from "./media-detail-dialog";
import { MediaEditDialog } from "./media-edit-dialog";
import { MediaListView } from "./media-list-view";

// ============= Configuration =============
const MEDIA_CONFIG = {
  maxFiles: 10,
  maxImageSize: 10 * 1024 * 1024,
  maxVideoSize: 100 * 1024 * 1024,
};

// ============= Root Component =============
interface MediaSectionRootProps {
  children: ReactNode;
}

function MediaSectionRoot({ children }: MediaSectionRootProps) {
  const childArray = Children.toArray(children);
  const sectionChildren: ReactNode[] = [];
  const dialogChildren: ReactNode[] = [];

  childArray.forEach((child) => {
    if (isValidElement(child) && child.type === MediaSectionDialogs) {
      dialogChildren.push(child);
    } else {
      sectionChildren.push(child);
    }
  });

  return (
    <>
      <div className="space-y-4">{sectionChildren}</div>
      {dialogChildren}
    </>
  );
}

// ============= View Toggle =============
type MediaViewMode = "compact" | "list";

interface ViewModeToggleProps {
  value: MediaViewMode;
  onChange: (value: MediaViewMode) => void;
}

function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={value}
      onValueChange={(next) => {
        if (next === "compact" || next === "list") {
          onChange(next);
        }
      }}
      aria-label="Toggle media view"
      className="shadow-none"
    >
      <ToggleGroupItem value="compact" aria-label="Compact view">
        <LayoutGrid className="h-4 w-4" />
        <span className="sr-only">Compact view</span>
      </ToggleGroupItem>
      <ToggleGroupItem value="list" aria-label="List view">
        <List className="h-4 w-4" />
        <span className="sr-only">List view</span>
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

// ============= Header =============
function MediaSectionHeader() {
  const { contentCreateData, clearAttachments } = useComposerStore();
  const { viewMode, setViewMode, setSelectedMedia, setEditingMedia } =
    useMediaUIStore();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const attachments = useMemo(
    () => contentCreateData.base.attachments ?? [],
    [contentCreateData.base.attachments],
  );
  const usedSlots = attachments.length;
  const remainingSlots = Math.max(MEDIA_CONFIG.maxFiles - usedSlots, 0);

  const headerDescription =
    usedSlots > 0
      ? `Drag to reorder, preview, or edit your uploads. ${
          remainingSlots > 0
            ? `${remainingSlots} slot${remainingSlots === 1 ? "" : "s"} left.`
            : "All slots are in use."
        }`
      : `Upload up to ${MEDIA_CONFIG.maxFiles} files. Images ${
          MEDIA_CONFIG.maxImageSize / (1024 * 1024)
        }MB, videos ${MEDIA_CONFIG.maxVideoSize / (1024 * 1024)}MB.`;

  useEffect(() => {
    if (attachments.length === 0) {
      setConfirmOpen(false);
    }
  }, [attachments.length]);

  const handleConfirmClear = () => {
    clearAttachments();
    setSelectedMedia(null);
    setEditingMedia(null);
    setConfirmOpen(false);
  };

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">Media</h3>
          <p className="text-xs text-muted-foreground">{headerDescription}</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground/90">
          <span className="font-medium">
            {usedSlots}/{MEDIA_CONFIG.maxFiles} files
          </span>
          {attachments.length > 0 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear all
              </Button>
              <ViewModeToggle
                value={viewMode}
                onChange={(mode) => setViewMode(mode)}
              />
            </>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remove all media?"
        desc="This will remove every uploaded file from the composer."
        confirmText="Remove"
        destructive
        handleConfirm={handleConfirmClear}
      />
    </>
  );
}

// ============= Upload =============
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
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground/80">
              Upload media
            </p>
            <p className="text-xs text-muted-foreground/80">
              Drag and drop files, or click to browse
            </p>
          </div>
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

// ============= Gallery =============
function MediaSectionGallery() {
  const { contentCreateData, removeAttachment, reorderAttachments } =
    useComposerStore();
  const {
    viewMode,
    setSelectedMedia,
    setEditingMedia,
    dragOverlay,
    setDragOverlay,
  } = useMediaUIStore();

  const attachments = useMemo(
    () => contentCreateData.base.attachments ?? [],
    [contentCreateData.base.attachments],
  );

  const { renderAttachment } = useAttachmentRenderer({ attachments });

  const getStableKey = (
    attachment: SharedAttachmentSpec,
    index: number,
  ): string => {
    return attachment.id || `media-${index}`;
  };

  const handleDragStart = (event: import("@dnd-kit/core").DragStartEvent) => {
    const { active } = event;
    const index = attachments.findIndex(
      (attachment: SharedAttachmentSpec, idx: number) =>
        getStableKey(attachment, idx) === active.id,
    );
    if (index !== -1) {
      setDragOverlay({ attachment: attachments[index], index });
    }
  };

  const handleDragEnd = (event: import("@dnd-kit/core").DragEndEvent) => {
    const { active, over } = event;
    setDragOverlay(null);

    if (over && active.id !== over.id) {
      const oldIndex = attachments.findIndex(
        (attachment: SharedAttachmentSpec, idx: number) =>
          getStableKey(attachment, idx) === active.id,
      );
      const newIndex = attachments.findIndex(
        (attachment: SharedAttachmentSpec, idx: number) =>
          getStableKey(attachment, idx) === over.id,
      );
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderAttachments(oldIndex, newIndex);
      }
    }
  };

  if (attachments.length === 0) return null;

  return viewMode === "compact" ? (
    <MediaCompactView
      attachments={attachments}
      getStableKey={getStableKey}
      dragOverlay={dragOverlay}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onRemove={removeAttachment}
      onPreview={(attachment, index) => setSelectedMedia({ attachment, index })}
      renderAttachment={renderAttachment}
    />
  ) : (
    <MediaListView
      attachments={attachments}
      getStableKey={getStableKey}
      dragOverlay={dragOverlay}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onRemove={removeAttachment}
      onPreview={(attachment, index) => setSelectedMedia({ attachment, index })}
      onEdit={(attachment, index) => setEditingMedia({ attachment, index })}
      renderAttachment={renderAttachment}
    />
  );
}

// ============= Content =============
function MediaSectionContent() {
  const { viewMode } = useMediaUIStore();

  const dropzoneWrapperClass =
    viewMode === "compact" ? "flex items-stretch gap-3" : "flex flex-col gap-4";

  return (
    <div className={dropzoneWrapperClass}>
      <MediaSectionUpload />
      <MediaSectionGallery />
    </div>
  );
}

// ============= Footer =============
function MediaSectionFooter() {
  const { contentCreateData } = useComposerStore();

  const attachments = useMemo(
    () => contentCreateData.base.attachments ?? [],
    [contentCreateData.base.attachments],
  );

  if (attachments.length > 0) return null;

  return (
    <div className="border-t pt-3">
      <p className="text-xs text-muted-foreground">
        Share photos and videos • Max {MEDIA_CONFIG.maxFiles} files • Images:{" "}
        {MEDIA_CONFIG.maxImageSize / (1024 * 1024)}MB • Videos:{" "}
        {MEDIA_CONFIG.maxVideoSize / (1024 * 1024)}MB
      </p>
    </div>
  );
}

// ============= Dialogs =============
function MediaSectionDialogs() {
  const { contentCreateData } = useComposerStore();
  const { selectedMedia, setSelectedMedia, editingMedia, setEditingMedia } =
    useMediaUIStore();

  const attachments = useMemo(
    () => contentCreateData.base.attachments ?? [],
    [contentCreateData.base.attachments],
  );

  const { renderAttachment } = useAttachmentRenderer({ attachments });

  return (
    <>
      <MediaDetailDialog
        selected={selectedMedia}
        onClose={() => setSelectedMedia(null)}
        renderAttachment={renderAttachment}
      />
      <MediaEditDialog
        editing={editingMedia}
        onClose={() => setEditingMedia(null)}
        renderAttachment={renderAttachment}
      />
    </>
  );
}

// ============= Compound Component Export =============
MediaSectionRoot.Header = MediaSectionHeader;
MediaSectionRoot.Upload = MediaSectionUpload;
MediaSectionRoot.Gallery = MediaSectionGallery;
MediaSectionRoot.Content = MediaSectionContent;
MediaSectionRoot.Footer = MediaSectionFooter;
MediaSectionRoot.Dialogs = MediaSectionDialogs;

export const MediaSection = MediaSectionRoot;
