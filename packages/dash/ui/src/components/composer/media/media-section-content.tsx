import { useMediaUIStore } from "@/stores/media-ui-store";
import { MediaSectionGallery } from "./media-section-gallery";
import { MediaSectionUpload } from "./media-section-upload";

function MediaSectionContent() {
  const { viewMode } = useMediaUIStore();

  const dropzoneWrapperClass =
    viewMode === "compact" ? "flex items-stretch gap-3" : "flex flex-col gap-4";

  return (
    <div className={dropzoneWrapperClass}>
      <MediaSectionUpload />
      <MediaSectionGallery />
    </div>
  );
}

export { MediaSectionContent };
