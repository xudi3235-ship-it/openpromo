import { MediaSectionContent } from "./media-section-content";
import { MediaSectionDialogs } from "./media-section-dialogs";
import { MediaSectionFooter } from "./media-section-footer";
import { MediaSectionGallery } from "./media-section-gallery";
import { MediaSectionHeader } from "./media-section-header";
import { MediaSectionRoot } from "./media-section-root";
import { MediaSectionUpload } from "./media-section-upload";

const MediaSection = Object.assign(MediaSectionRoot, {
  Header: MediaSectionHeader,
  Upload: MediaSectionUpload,
  Gallery: MediaSectionGallery,
  Content: MediaSectionContent,
  Footer: MediaSectionFooter,
  Dialogs: MediaSectionDialogs,
}) as typeof MediaSectionRoot & {
  Header: typeof MediaSectionHeader;
  Upload: typeof MediaSectionUpload;
  Gallery: typeof MediaSectionGallery;
  Content: typeof MediaSectionContent;
  Footer: typeof MediaSectionFooter;
  Dialogs: typeof MediaSectionDialogs;
};

export { MediaSection };
