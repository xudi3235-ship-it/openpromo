import { Stack } from "@openpromo/ui/components/stack";
import { AccountSelection } from "@/components/composer/controls/account-selection";
import { PostDetails } from "@/components/composer/controls/post-details";
import { SchedulingOptions } from "@/components/composer/controls/scheduling-options";
import { ComposerFooter } from "@/components/composer/layout/composer-footer";
import { ComposerHeader } from "@/components/composer/layout/composer-header";
import { MediaUpload } from "@/components/composer/media/media-upload";

export function ComposerLeft() {
  return (
    <div className="h-full min-h-0 overflow-y-auto p-4 md:p-6">
      <Stack gap="lg">
        <ComposerHeader />
        <Stack gap="lg">
          <AccountSelection />
          <MediaUpload />
          <PostDetails />
          <SchedulingOptions />
        </Stack>
        <ComposerFooter />
      </Stack>
    </div>
  );
}
