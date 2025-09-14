import { AccountSelection } from "@/components/composer/account-selection";
import { ComposerFooter } from "@/components/composer/composer-footer";
import { MediaUpload } from "@/components/composer/media-upload";
import { PostDetails } from "@/components/composer/post-details";
import { SchedulingOptions } from "@/components/composer/scheduling-options";
import { useDialogComposerStore } from "@/stores/dialog-composer-store";

export function ComposerLeft() {
  const { pendingContentGroupID } = useDialogComposerStore();
  const isEditing = !!pendingContentGroupID;

  return (
    <div className="h-full p-4 md:p-6 space-y-4 overflow-y-auto">
      {isEditing && (
        <div className="flex items-center gap-2 pb-3 text-sm text-muted-foreground">
          <div className="h-2 w-2 rounded-full bg-orange-500"></div>
          <span>Editing existing content</span>
        </div>
      )}
      <AccountSelection />
      <MediaUpload />
      <PostDetails />
      <SchedulingOptions />
      <ComposerFooter />
    </div>
  );
}
