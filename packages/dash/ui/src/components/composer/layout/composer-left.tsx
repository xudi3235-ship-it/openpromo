import { AccountSelection } from "@/components/composer/controls/account-selection";
import { PostDetails } from "@/components/composer/controls/post-details";
import { SchedulingOptions } from "@/components/composer/controls/scheduling-options";
import { ValidationErrors } from "@/components/composer/controls/validation-errors";
import { ComposerFooter } from "@/components/composer/layout/composer-footer";
import { ComposerHeader } from "@/components/composer/layout/composer-header";
import { MediaUpload } from "@/components/composer/media/media-upload";
import { useComposerStore } from "@/stores/composer-store";

export function ComposerLeft() {
  const { validation } = useComposerStore();

  return (
    <div className="h-full flex flex-col">
      {/* Fixed Header */}
      <div className="flex-shrink-0 px-4 md:px-6 py-2 relative z-20">
        <ComposerHeader />
      </div>

      {/* Scrollable Content with Glass Effects */}
      <div className="flex-1 overflow-y-auto relative px-4 md:px-6 pb-0 flex flex-col gap-6 scroll-feather">
        <AccountSelection />
        <MediaUpload />
        <PostDetails />
        <SchedulingOptions />
      </div>

      {/* Fixed Footer Actions with Validation */}
      <div className="flex-shrink-0 mx-4 mt-0 space-y-3">
        {/* Validation Errors - Fixed above footer */}
        <ValidationErrors errors={validation.errors} />

        {/* Footer Actions */}
        <div className="rounded-xl border border-border/60 bg-background/50 p-4">
          <ComposerFooter />
        </div>
      </div>
    </div>
  );
}
