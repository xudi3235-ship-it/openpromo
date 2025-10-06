import { Label } from "@openpromo/ui/components/label";
import { Switch } from "@openpromo/ui/components/switch";
import type { SharedAttachmentSpec } from "@shared/content";
import { Upload } from "lucide-react";
import type { ReactNode } from "react";
import { createContext, useContext, useMemo, useState } from "react";
import { Dropzone } from "@/components/dropzone";
import { useAttachmentRenderer } from "@/hooks/useAttachmentRenderer";
import { useComposerMediaUploader } from "@/hooks/useComposerMediaUploader";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useComposerStore } from "@/stores/composer-store";
import { MediaCompactView } from "./media-compact-view";
import { MediaDetailDialog } from "./media-detail-dialog";
import { MediaEditDialog } from "./media-edit-dialog";
import { MediaListView } from "./media-list-view";

// ============= Context =============
interface MediaSectionContextValue {
  attachments: SharedAttachmentSpec[];
  viewMode: "compact" | "list";
  setViewMode: (mode: "compact" | "list") => void;
  config: {
    maxFiles: number;
    maxImageSize: number;
    maxVideoSize: number;
  };
  handlers: {
    handleFiles: (files: File[]) => void;
    removeAttachment: (index: number) => void;
    reorderAttachments: (oldIndex: number, newIndex: number) => void;
  };
  renderAttachment: ReturnType<
    typeof useAttachmentRenderer
  >["renderAttachment"];
  selectedMedia: { attachment: SharedAttachmentSpec; index: number } | null;
  setSelectedMedia: (
    media: { attachment: SharedAttachmentSpec; index: number } | null,
  ) => void;
  editingMedia: { attachment: SharedAttachmentSpec; index: number } | null;
  setEditingMedia: (
    media: { attachment: SharedAttachmentSpec; index: number } | null,
  ) => void;
  dragOverlay: { attachment: SharedAttachmentSpec; index: number } | null;
  setDragOverlay: (
    overlay: { attachment: SharedAttachmentSpec; index: number } | null,
  ) => void;
}

const MediaSectionContext = createContext<MediaSectionContextValue | null>(
  null,
);

function useMediaSection() {
  const context = useContext(MediaSectionContext);
  if (!context) {
    throw new Error(
      "MediaSection components must be used within <MediaSection>",
    );
  }
  return context;
}

// ============= Root Component =============
interface MediaSectionRootProps {
  children: ReactNode;
}

function MediaSectionRoot({ children }: MediaSectionRootProps) {
  const { workspace } = useWorkspace();
  const { contentCreateData, removeAttachment, reorderAttachments } =
    useComposerStore();

  const attachments = useMemo(
    () => contentCreateData.base.attachments ?? [],
    [contentCreateData.base.attachments],
  );

  const { renderAttachment } = useAttachmentRenderer({ attachments });

  const config = {
    maxFiles: 10,
    maxImageSize: 10 * 1024 * 1024,
    maxVideoSize: 100 * 1024 * 1024,
  };

  const { handleFiles } = useComposerMediaUploader({
    workspaceSlug: workspace?.slug,
    maxFiles: config.maxFiles,
    maxImageSize: config.maxImageSize,
    maxVideoSize: config.maxVideoSize,
  });

  const [viewMode, setViewMode] = useState<"compact" | "list">("compact");
  const [selectedMedia, setSelectedMedia] = useState<{
    attachment: SharedAttachmentSpec;
    index: number;
  } | null>(null);
  const [editingMedia, setEditingMedia] = useState<{
    attachment: SharedAttachmentSpec;
    index: number;
  } | null>(null);
  const [dragOverlay, setDragOverlay] = useState<{
    attachment: SharedAttachmentSpec;
    index: number;
  } | null>(null);

  const value: MediaSectionContextValue = {
    attachments,
    viewMode,
    setViewMode,
    config,
    handlers: {
      handleFiles,
      removeAttachment,
      reorderAttachments,
    },
    renderAttachment,
    selectedMedia,
    setSelectedMedia,
    editingMedia,
    setEditingMedia,
    dragOverlay,
    setDragOverlay,
  };

  return (
    <MediaSectionContext.Provider value={value}>
      <div className="space-y-3">{children}</div>
    </MediaSectionContext.Provider>
  );
}

// ============= Header =============
function MediaSectionHeader() {
  const { attachments, viewMode, setViewMode, config } = useMediaSection();

  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-sm font-medium text-foreground">Media</h3>
      <div className="flex items-center gap-3">
        {attachments.length > 0 && (
          <>
            <span className="text-xs text-muted-foreground">
              {attachments.length}/{config.maxFiles} files
            </span>
            <div className="flex items-center gap-2">
              <Switch
                id="media-view-switch"
                checked={viewMode === "list"}
                onCheckedChange={(checked) =>
                  setViewMode(checked ? "list" : "compact")
                }
                aria-label="Toggle list view"
              />
              <Label
                htmlFor="media-view-switch"
                className="text-xs text-muted-foreground"
              >
                List view
              </Label>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============= Upload =============
function MediaSectionUpload() {
  const { attachments, viewMode, config, handlers } = useMediaSection();

  const isAtLimit = attachments.length >= config.maxFiles;
  const remainingSlots = Math.max(config.maxFiles - attachments.length, 0);

  const dropzoneClassName =
    viewMode === "compact"
      ? attachments.length === 0
        ? "flex-1 h-16"
        : "flex-shrink-0 w-16 h-16"
      : "w-full h-28";

  return (
    <Dropzone
      accept={{ "image/*": [], "video/*": [] }}
      maxFiles={Math.max(remainingSlots, 1)}
      maxSize={Math.max(config.maxVideoSize, config.maxImageSize)}
      onDrop={handlers.handleFiles}
      disabled={isAtLimit}
      className={`${dropzoneClassName} border-dashed border-2 border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors rounded-lg ${
        isAtLimit ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
        {viewMode === "compact" ? (
          attachments.length === 0 ? (
            <>
              <Upload className="h-4 w-4" />
              <span className="text-sm">Drop files or click to upload</span>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <Upload className="h-3 w-3" />
              <span className="text-xs">{isAtLimit ? "Max" : "Add"}</span>
            </div>
          )
        ) : (
          <>
            <Upload className="h-4 w-4" />
            <div className="text-left">
              <p className="text-sm font-medium">Upload media</p>
              <p className="text-xs text-muted-foreground">
                Drag files here or click to browse integrations.
              </p>
            </div>
          </>
        )}
      </div>
    </Dropzone>
  );
}

// ============= Gallery =============
function MediaSectionGallery() {
  const {
    attachments,
    viewMode,
    handlers,
    renderAttachment,
    setSelectedMedia,
    setEditingMedia,
    dragOverlay,
    setDragOverlay,
  } = useMediaSection();

  const getStableKey = (
    attachment: SharedAttachmentSpec,
    index: number,
  ): string => {
    return attachment.id || `media-${index}`;
  };

  const handleDragStart = (event: import("@dnd-kit/core").DragStartEvent) => {
    const { active } = event;
    const index = attachments.findIndex(
      (attachment, idx) => getStableKey(attachment, idx) === active.id,
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
        (attachment, idx) => getStableKey(attachment, idx) === active.id,
      );
      const newIndex = attachments.findIndex(
        (attachment, idx) => getStableKey(attachment, idx) === over.id,
      );
      if (oldIndex !== -1 && newIndex !== -1) {
        handlers.reorderAttachments(oldIndex, newIndex);
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
      onRemove={handlers.removeAttachment}
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
      onRemove={handlers.removeAttachment}
      onPreview={(attachment, index) => setSelectedMedia({ attachment, index })}
      onEdit={(attachment, index) => setEditingMedia({ attachment, index })}
      renderAttachment={renderAttachment}
    />
  );
}

// ============= Content =============
function MediaSectionContent() {
  const { viewMode } = useMediaSection();

  const dropzoneWrapperClass =
    viewMode === "compact" ? "flex gap-2" : "flex flex-col gap-3";

  return (
    <div className={dropzoneWrapperClass}>
      <MediaSectionUpload />
      <MediaSectionGallery />
    </div>
  );
}

// ============= Footer =============
function MediaSectionFooter() {
  const { attachments, config } = useMediaSection();

  if (attachments.length > 0) return null;

  return (
    <p className="text-xs text-muted-foreground">
      Share photos and videos • Max {config.maxFiles} files • Images:{" "}
      {config.maxImageSize / (1024 * 1024)}MB • Videos:{" "}
      {config.maxVideoSize / (1024 * 1024)}MB
    </p>
  );
}

// ============= Dialogs =============
function MediaSectionDialogs() {
  const {
    selectedMedia,
    setSelectedMedia,
    editingMedia,
    setEditingMedia,
    renderAttachment,
  } = useMediaSection();

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

// ============= AI Actions (placeholder for future) =============
function MediaSectionAIActions({ children }: { children?: ReactNode }) {
  // Future: AI generation, enhancement, etc.
  return <div className="space-y-2">{children}</div>;
}

// ============= Compound Component Export =============
MediaSectionRoot.Header = MediaSectionHeader;
MediaSectionRoot.Upload = MediaSectionUpload;
MediaSectionRoot.Gallery = MediaSectionGallery;
MediaSectionRoot.Content = MediaSectionContent;
MediaSectionRoot.Footer = MediaSectionFooter;
MediaSectionRoot.Dialogs = MediaSectionDialogs;
MediaSectionRoot.AIActions = MediaSectionAIActions;

export const MediaSection = MediaSectionRoot;
