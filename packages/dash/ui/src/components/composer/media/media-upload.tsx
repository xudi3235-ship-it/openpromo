import { MediaSection } from "./media-section";
import { MediaTabs } from "./media-tabs";

/**
 * MediaUpload - Now includes tabbed interface for Upload and Generate
 */
export function MediaUpload() {
  return (
    <MediaSection>
      <MediaSection.Header />
      <MediaTabs />
      <MediaSection.Dialogs />
    </MediaSection>
  );
}
