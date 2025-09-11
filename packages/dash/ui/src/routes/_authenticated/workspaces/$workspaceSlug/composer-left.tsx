import { AccountSelection } from "./account-selection";
import { ComposerFooter } from "./composer-footer";
import { MediaUpload } from "./media-upload";
import { PostDetails } from "./post-details";
import { SchedulingOptions } from "./scheduling-options";

export function ComposerLeft() {
  return (
    <div className="w-[600px] p-6 space-y-4 overflow-y-auto max-h-screen">
      <AccountSelection />
      <MediaUpload />
      <PostDetails />
      <SchedulingOptions />
      <ComposerFooter />
    </div>
  );
}
