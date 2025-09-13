import { AccountSelection } from "@/components/composer/account-selection";
import { ComposerFooter } from "@/components/composer/composer-footer";
import { MediaUpload } from "@/components/composer/media-upload";
import { PostDetails } from "@/components/composer/post-details";
import { SchedulingOptions } from "@/components/composer/scheduling-options";

export function ComposerLeft() {
  return (
    <div className="w-full md:w-[500px] lg:w-[600px] p-4 md:p-6 space-y-4 overflow-y-auto flex-shrink-0">
      <AccountSelection />
      <MediaUpload />
      <PostDetails />
      <SchedulingOptions />
      <ComposerFooter />
    </div>
  );
}
