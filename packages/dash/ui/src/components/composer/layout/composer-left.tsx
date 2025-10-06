import { AccountSelection } from "@/components/composer/controls/account-selection";
import { PostDetails } from "@/components/composer/controls/post-details";
import { SchedulingOptions } from "@/components/composer/controls/scheduling-options";
import { ComposerFooter } from "@/components/composer/layout/composer-footer";
import { ComposerHeader } from "@/components/composer/layout/composer-header";
import { MediaUpload } from "@/components/composer/media/media-upload";

export function ComposerLeft() {
  return (
    <div className="h-full p-4 md:p-6 space-y-4 overflow-y-auto">
      <ComposerHeader />
      <AccountSelection />
      <MediaUpload />
      <PostDetails />
      <SchedulingOptions />
      <ComposerFooter />
    </div>
  );
}
