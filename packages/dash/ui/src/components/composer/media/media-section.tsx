import { Button } from "@openpromo/ui/components/button";
import { Label } from "@openpromo/ui/components/label";
import { Switch } from "@openpromo/ui/components/switch";
import type { SharedAttachmentSpec } from "@shared/content";
import { Package, Upload } from "lucide-react";
import React, { type ReactNode, useEffect, useMemo, useState } from "react";
import { Dropzone } from "@/components/dropzone";
import { useAttachmentRenderer } from "@/hooks/useAttachmentRenderer";
import { useComposerMediaUploader } from "@/hooks/useComposerMediaUploader";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useComposerStore } from "@/stores/composer-store";
import { useMediaUIStore } from "@/stores/media-ui-store";
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
  return <div className="space-y-3">{children}</div>;
}

// ============= Header =============
function MediaSectionHeader() {
  const { contentCreateData } = useComposerStore();
  const { viewMode, setViewMode, setProductModalOpen } = useMediaUIStore();

  const attachments = useMemo(
    () => contentCreateData.base.attachments ?? [],
    [contentCreateData.base.attachments],
  );

  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-sm font-medium text-foreground">Media</h3>
      <div className="flex items-center gap-3">
        {attachments.length > 0 && (
          <>
            <span className="text-xs text-muted-foreground">
              {attachments.length}/{MEDIA_CONFIG.maxFiles} files
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs gap-1.5 text-primary hover:text-primary/80"
              onClick={() => setProductModalOpen(true)}
            >
              <Package className="h-3 w-3" />
              Generate with AI
            </Button>
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
      maxSize={Math.max(MEDIA_CONFIG.maxVideoSize, MEDIA_CONFIG.maxImageSize)}
      onDrop={handleFiles}
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
  const { contentCreateData } = useComposerStore();

  const attachments = useMemo(
    () => contentCreateData.base.attachments ?? [],
    [contentCreateData.base.attachments],
  );

  if (attachments.length > 0) return null;

  return (
    <p className="text-xs text-muted-foreground">
      Share photos and videos • Max {MEDIA_CONFIG.maxFiles} files • Images:{" "}
      {MEDIA_CONFIG.maxImageSize / (1024 * 1024)}MB • Videos:{" "}
      {MEDIA_CONFIG.maxVideoSize / (1024 * 1024)}MB
    </p>
  );
}

// ============= Product Actions =============
function MediaSectionProductActions() {
  const { contentCreateData } = useComposerStore();
  const { setProductModalOpen } = useMediaUIStore();

  const attachments = useMemo(
    () => contentCreateData.base.attachments ?? [],
    [contentCreateData.base.attachments],
  );

  if (attachments.length === 0) return null;

  return (
    <div className="border-t pt-3">
      <Button
        variant="default"
        size="sm"
        className="w-full gap-2"
        onClick={() => setProductModalOpen(true)}
      >
        <Package className="h-4 w-4" />
        Generate with AI
      </Button>
    </div>
  );
}

// ============= Dialogs =============
function MediaSectionDialogs() {
  const { contentCreateData } = useComposerStore();
  const {
    selectedMedia,
    setSelectedMedia,
    editingMedia,
    setEditingMedia,
    productModalOpen,
    setProductModalOpen,
  } = useMediaUIStore();

  const attachments = useMemo(
    () => contentCreateData.base.attachments ?? [],
    [contentCreateData.base.attachments],
  );

  const { renderAttachment } = useAttachmentRenderer({ attachments });

  // Lazy load ProductAIWorkflowDialog
  const [ProductAIWorkflowDialog, setProductAIWorkflowDialog] =
    useState<
      React.ComponentType<{
        open: boolean;
        onOpenChange: (open: boolean) => void;
        prefilledAttachments?: SharedAttachmentSpec[];
      }>
    >();

  // Dynamically import ProductAIWorkflowDialog when needed
  useEffect(() => {
    if (productModalOpen && !ProductAIWorkflowDialog) {
      import("./product-ai-workflow-dialog").then((module) => {
        setProductAIWorkflowDialog(
          () =>
            module.ProductAIWorkflowDialog as React.ComponentType<{
              open: boolean;
              onOpenChange: (open: boolean) => void;
              prefilledAttachments?: SharedAttachmentSpec[];
            }>,
        );
      });
    }
    // setProductAIWorkflowDialog is stable from useState
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productModalOpen, ProductAIWorkflowDialog]);

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
      {ProductAIWorkflowDialog && (
        <ProductAIWorkflowDialog
          open={productModalOpen}
          onOpenChange={setProductModalOpen}
          prefilledAttachments={attachments}
        />
      )}
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
MediaSectionRoot.ProductActions = MediaSectionProductActions;
MediaSectionRoot.Dialogs = MediaSectionDialogs;
MediaSectionRoot.AIActions = MediaSectionAIActions;

export const MediaSection = MediaSectionRoot;
