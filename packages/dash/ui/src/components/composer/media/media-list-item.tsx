import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@openpromo/ui/components/tooltip";
import { cn } from "@openpromo/ui/lib/utils";
import type { SharedAttachmentSpec } from "@shared/content";
import {
  FileText,
  GripVertical,
  Loader2,
  Pencil,
  Trash,
  Video,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMediaDimensions } from "@/hooks/useMediaDimensions";

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
  const { aspectRatio } = useMediaDimensions(attachment);
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
        "flex w-full items-start gap-3 rounded-lg border border-border/70 bg-background p-3 transition shadow-none",
        isDragging && "ring-1 ring-ring/50",
      )}
    >
      <Tooltip delayDuration={150}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded bg-muted text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            style={{ cursor: isDragging ? "grabbing" : "grab" }}
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3 w-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6}>
          Drag to reorder
        </TooltipContent>
      </Tooltip>

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
              {[
                typeLabel,
                aspectRatio,
                fileSize,
                uploading ? "Uploading" : null,
                error ? "Needs attention" : null,
              ]
                .filter(Boolean)
                .join(" • ")}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Tooltip delayDuration={150}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onEdit(attachment, index)}
                  disabled={uploading}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-muted-foreground transition hover:border-border hover:bg-muted disabled:opacity-50"
                  aria-label="Edit media"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={150}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  disabled={uploading}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-destructive transition hover:border-destructive/40 hover:bg-destructive/10 disabled:opacity-50"
                  aria-label="Remove media"
                >
                  <Trash className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Remove</TooltipContent>
            </Tooltip>
          </div>
        </div>
        {error && !uploading && (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1 text-xs text-destructive">
            Upload failed. Remove or replace this media.
          </p>
        )}
      </div>
    </div>
  );
}
