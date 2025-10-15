import { closestCenter, DndContext, DragOverlay } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { SharedAttachmentSpec } from "@shared/content";
import type { ReactNode } from "react";
import { MediaListItem } from "./media-list-item";

type RenderFn = (
  attachment: SharedAttachmentSpec,
  className?: string,
  controls?: boolean,
) => ReactNode;

interface MediaListViewProps {
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
  onEdit: (attachment: SharedAttachmentSpec, index: number) => void;
  renderAttachment: RenderFn;
}

export function MediaListView({
  attachments,
  getStableKey,
  dragOverlay,
  onDragStart,
  onDragEnd,
  onRemove,
  onPreview,
  onEdit,
  renderAttachment,
}: MediaListViewProps) {
  return (
    <div className="space-y-2">
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={attachments.map((attachment, index) =>
            getStableKey(attachment, index),
          )}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {attachments.map((attachment, index) => {
              const stableKey = getStableKey(attachment, index);

              return (
                <MediaListItem
                  key={stableKey}
                  id={stableKey}
                  attachment={attachment}
                  index={index}
                  onRemove={onRemove}
                  onPreview={onPreview}
                  onEdit={onEdit}
                  renderAttachment={renderAttachment}
                />
              );
            })}
          </div>
        </SortableContext>

        <DragOverlay>
          {dragOverlay && (
            <div className="relative h-24 w-32 overflow-hidden rounded-lg bg-muted opacity-80">
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
