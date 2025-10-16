import { Button } from "@openpromo/ui/components/button";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@openpromo/ui/components/toggle-group";
import { LayoutGrid, List, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useComposerStore } from "@/stores/composer-store";
import { useMediaUIStore } from "@/stores/media-ui-store";
import { MEDIA_CONFIG } from "./media-section-config";

type MediaViewMode = "compact" | "list";

function ViewModeToggle({
  value,
  onChange,
}: {
  value: MediaViewMode;
  onChange: (value: MediaViewMode) => void;
}) {
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
      : `Share up to ${MEDIA_CONFIG.maxFiles} files. Images ${
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
          <h3 className="text-sm font-semibold text-foreground">
            Share photos and videos
          </h3>
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

export { MediaSectionHeader };
