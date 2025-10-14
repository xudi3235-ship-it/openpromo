import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SharedAttachmentSpec } from "@shared/content";
import { GripVertical, ImageIcon, Type, X } from "lucide-react";
import type { ReactNode } from "react";

interface DraggableMediaItemProps {
  id: string;
  attachment: SharedAttachmentSpec;
  index: number;
  onRemove: (index: number) => void;
  onClick: (attachment: SharedAttachmentSpec, index: number) => void;
  onEditAltText: (attachment: SharedAttachmentSpec, index: number) => void;
  renderAttachment: (
    attachment: SharedAttachmentSpec,
    className?: string,
    controls?: boolean,
  ) => ReactNode;
}

export function DraggableMediaItem({
  id,
  attachment,
  index,
  onRemove,
  onClick,
  onEditAltText,
  renderAttachment,
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
  const error = typeof meta.error === "string" ? meta.error : undefined;
  const hasAltText = Boolean(
    typeof meta.altText === "string" && (meta.altText as string).trim(),
  );

  const previewNode = renderAttachment(
    attachment,
    "w-full h-full object-cover",
  ) ?? (
    <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
      <ImageIcon className="h-5 w-5" />
    </div>
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative flex-shrink-0 w-16 h-16 group rounded-lg overflow-hidden bg-muted cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring ${
        isDragging ? "opacity-50 z-50" : ""
      }`}
    >
      <button
        type="button"
        className="absolute top-1 left-1 w-5 h-5 bg-black/50 hover:bg-black/70 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none focus:opacity-100 z-20"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3 w-3 text-white" />
      </button>

      <button
        type="button"
        className="w-full h-full focus:outline-none"
        onClick={() => onClick(attachment, index)}
        title="Click to view details"
      >
        {previewNode}
        {(uploading || error) && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-white text-xs font-medium">
              {uploading ? "..." : "!"}
            </div>
          </div>
        )}
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onRemove(index);
        }}
        disabled={uploading}
        className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none focus:opacity-100 disabled:opacity-50 z-10"
      >
        <X className="h-3 w-3 text-white" />
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onEditAltText(attachment, index);
        }}
        disabled={uploading}
        className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none focus:opacity-100 disabled:opacity-50"
      >
        <Type className="h-3 w-3" />
        {hasAltText ? "Alt" : "Add"}
      </button>
    </div>
  );
}
