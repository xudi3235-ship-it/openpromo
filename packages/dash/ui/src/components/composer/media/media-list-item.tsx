import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@openpromo/ui/components/button";
import { cn } from "@openpromo/ui/lib/utils";
import type { SharedAttachmentSpec } from "@shared/content";
import {
  FileText,
  GripVertical,
  Loader2,
  Pencil,
  Trash,
  Type,
  Video,
} from "lucide-react";
import type { ReactNode } from "react";

interface MediaListItemProps {
  id: string;
  attachment: SharedAttachmentSpec;
  index: number;
  renderAttachment: (
    attachment: SharedAttachmentSpec,
    className?: string,
    controls?: boolean,
  ) => ReactNode;
  onPreview: (attachment: SharedAttachmentSpec, index: number) => void;
  onEdit: (attachment: SharedAttachmentSpec, index: number) => void;
  onRemove: (index: number) => void;
  onEditAltText: (attachment: SharedAttachmentSpec, index: number) => void;
}

const formatFileSize = (bytes?: number) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

export function MediaListItem({
  id,
  attachment,
  index,
  renderAttachment,
  onPreview,
  onEdit,
  onRemove,
  onEditAltText,
}: MediaListItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const uploading = Boolean(attachment.metadata?.uploading);
  const error = typeof attachment.metadata?.error === "string";
  const fileName =
    attachment.file?.name || attachment.metadata?.originalFilename;
  const fileSize = formatFileSize(attachment.file?.size);
  const typeLabel = attachment.type === "video" ? "Video" : "Photo";
  const hasAltText = Boolean(
    typeof attachment.metadata?.altText === "string" &&
      (attachment.metadata.altText as string).trim(),
  );

  const previewNode = renderAttachment(
    attachment,
    "w-full h-full object-cover",
  ) ?? (
    <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
      {attachment.type === "video" ? (
        <Video className="h-5 w-5" />
      ) : (
        <FileText className="h-5 w-5" />
      )}
    </div>
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex w-full items-start gap-4 rounded-lg border border-border/70 bg-background/95 p-3 transition shadow-none",
        isDragging && "ring-1 ring-ring/50",
      )}
    >
      <button
        type="button"
        className="mt-1 flex h-6 w-6 items-center justify-center rounded bg-muted text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        title="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3 w-3" />
      </button>

      <button
        type="button"
        onClick={() => onPreview(attachment, index)}
        className="relative h-24 w-32 overflow-hidden rounded-lg bg-muted"
        title="Preview media"
      >
        {previewNode}
        {(uploading || error) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            ) : (
              <span className="text-xs font-medium text-white">!</span>
            )}
          </div>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-foreground">
              {fileName || `Media ${index + 1}`}
            </p>
            <p className="text-xs text-muted-foreground">
              {typeLabel}
              {fileSize ? ` • ${fileSize}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onEditAltText(attachment, index)}
              disabled={uploading}
            >
              <Type className="mr-1 h-4 w-4" />
              {hasAltText ? "Edit alt text" : "Add alt text"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onEdit(attachment, index)}
              disabled={uploading}
            >
              <Pencil className="mr-1 h-4 w-4" /> Edit
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onRemove(index)}
              disabled={uploading}
            >
              <Trash className="mr-1 h-4 w-4" /> Remove
            </Button>
          </div>
        </div>

        <div className="rounded-md border bg-muted/40 p-2 text-xs text-muted-foreground">
          {uploading && "Uploading…"}
          {!uploading &&
            error &&
            "Upload failed. Remove or replace this media."}
          {!uploading && !error && (
            <span>
              Ready to publish. Use Edit for cropping, enhancements, or
              integrations.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
