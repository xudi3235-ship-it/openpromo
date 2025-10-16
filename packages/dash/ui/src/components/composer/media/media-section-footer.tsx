import { useMemo } from "react";
import { useComposerStore } from "@/stores/composer-store";
import { MEDIA_CONFIG } from "./media-section-config";

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

export { MediaSectionFooter };
