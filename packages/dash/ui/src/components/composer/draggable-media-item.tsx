import type { SharedAttachmentSpec } from "@core/schemas/content.sql";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
import { MediaItemFactory, MediaRenderer } from "@/lib/media";

interface MediaPreview {
  file: File;
  url: string;
  aspectRatio: string;
  mimeType: string;
  previewIframeUrl?: string;
  isStreamVideo?: boolean;
}

interface DraggableMediaItemProps {
  id: string;
  preview: MediaPreview;
  attachment: SharedAttachmentSpec;
  index: number;
  onRemove: (index: number) => void;
  onClick: (preview: MediaPreview, index: number) => void;
}

export function DraggableMediaItem({
  id,
  preview,
  attachment,
  index,
  onRemove,
  onClick,
}: DraggableMediaItemProps) {
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

  const meta = (attachment?.metadata || {}) as Record<string, unknown>;
  const uploading = Boolean(meta.uploading);
  const error = meta.error as string | undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative flex-shrink-0 w-16 h-16 group rounded-lg overflow-hidden bg-muted cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring ${
        isDragging ? "opacity-50 z-50" : ""
      }`}
    >
      {/* Drag Handle */}
      <button
        type="button"
        className="absolute top-1 left-1 w-5 h-5 bg-black/50 hover:bg-black/70 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none focus:opacity-100 z-20"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3 w-3 text-white" />
      </button>

      {/* Media Content - Clickable */}
      <button
        type="button"
        className="w-full h-full focus:outline-none"
        onClick={() => onClick(preview, index)}
        title="Click to view details"
      >
        {/* Media Preview - Using Unified MediaRenderer */}
        {MediaRenderer.renderThumbnail(
          MediaItemFactory.fromAttachment(attachment),
          "w-full h-full object-cover",
        )}

        {/* Status Overlay */}
        {(uploading || error) && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-white text-xs font-medium">
              {uploading ? "..." : "!"}
            </div>
          </div>
        )}
      </button>

      {/* Remove Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(index);
        }}
        disabled={uploading}
        className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none focus:opacity-100 disabled:opacity-50 z-10"
      >
        <X className="h-3 w-3 text-white" />
      </button>
    </div>
  );
}
