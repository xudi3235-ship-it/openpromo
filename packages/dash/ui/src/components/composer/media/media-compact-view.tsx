import { closestCenter, DndContext, DragOverlay } from "@dnd-kit/core";
import {
  horizontalListSortingStrategy,
  SortableContext,
} from "@dnd-kit/sortable";
import type { SharedAttachmentSpec } from "@shared/content";
import type { ReactNode } from "react";
import { DraggableMediaItem } from "./draggable-media-item";

type RenderFn = (
  attachment: SharedAttachmentSpec,
  className?: string,
  controls?: boolean,
) => ReactNode;

interface MediaCompactViewProps {
  attachments: SharedAttachmentSpec[];
  getStableKey: (attachment: SharedAttachmentSpec, index: number) => string;
  dragOverlay: {
    attachment: SharedAttachmentSpec;
    index: number;
  } | null;
  onDragStart: (event: import("@dnd-kit/core").DragStartEvent) => void;
  onDragEnd: (event: import("@dnd-kit/core").DragEndEvent) => void;
  onRemove: (index: number) => void;
  onPreview: (attachment: SharedAttachmentSpec, index: number) => void;
  onEditAltText: (attachment: SharedAttachmentSpec, index: number) => void;
  renderAttachment: RenderFn;
}

export function MediaCompactView({
  attachments,
  getStableKey,
  dragOverlay,
  onDragStart,
  onDragEnd,
  onRemove,
  onPreview,
  onEditAltText,
  renderAttachment,
}: MediaCompactViewProps) {
  return (
    <div className="flex-1 overflow-x-auto">
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={attachments.map((attachment, index) =>
            getStableKey(attachment, index),
          )}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex gap-2">
            {attachments.map((attachment, index) => {
              const stableKey = getStableKey(attachment, index);

              return (
                <DraggableMediaItem
                  key={stableKey}
                  id={stableKey}
                  attachment={attachment}
                  index={index}
                  onRemove={onRemove}
                  onClick={onPreview}
                  onEditAltText={onEditAltText}
                  renderAttachment={renderAttachment}
                />
              );
            })}
          </div>
        </SortableContext>

        <DragOverlay>
          {dragOverlay && (
            <div className="relative flex-shrink-0 h-16 w-16 overflow-hidden rounded-lg bg-muted opacity-80">
              {renderAttachment(
                dragOverlay.attachment,
                "w-full h-full object-cover",
              ) || (
                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                  No preview
                </div>
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
