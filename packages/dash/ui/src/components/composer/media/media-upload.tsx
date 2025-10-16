import { MediaSection } from "./media-section";

/**
 * MediaUpload - Legacy component that uses the new MediaSection composition
 * Kept for backward compatibility
 */
export function MediaUpload() {
  return (
    <MediaSection>
      <MediaSection.Header />
      <MediaSection.Content />
      <MediaSection.Dialogs />
    </MediaSection>
  );
}
