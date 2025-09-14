import { Button } from "@openpromo/ui/components/button";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useHonoMutation } from "@/lib/hono-client";
import { useComposerStore } from "@/stores/composer-store";

function useContentCreateMutation({
  onSettled,
}: {
  onSettled?: () => void;
} = {}) {
  const { workspace } = useWorkspace();
  const { contentCreateData } = useComposerStore();
  return useHonoMutation({
    mutationFn: (api) =>
      api.workspaces[":workspaceSlug"].content.create.$post({
        param: { workspaceSlug: workspace.slug },
        json: contentCreateData,
      }),
    onSettled,
  });
}

export function ComposerFooter() {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { setPublishingStatus, contentCreateData } = useComposerStore();

  const { mutate, isPending } = useContentCreateMutation({
    onSettled: () => {
      setShowConfirmDialog(false);
    },
  });

  // Derive action type from store's publishing status
  const actionType =
    contentCreateData.base.publishingStatus === "DRAFT" ? "draft" : "publish";

  const handleSaveDraft = () => {
    setPublishingStatus("DRAFT");
    setShowConfirmDialog(true);
  };

  const handlePublish = () => {
    setPublishingStatus("PUBLISH_NOW");
    setShowConfirmDialog(true);
  };

  const handleConfirm = () => {
    mutate({});
  };

  const dialogConfig = {
    draft: {
      title: "Save Draft",
      desc: "Are you sure you want to save this content as a draft? You can publish it later.",
      confirmText: "Save Draft",
    },
    publish: {
      title: "Publish Content",
      desc: "Are you sure you want to publish this content to your selected social media accounts?",
      confirmText: "Publish",
    },
  };

  const config = dialogConfig[actionType];

  return (
    <>
      <div className="border-t bg-background p-4">
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm">
            Cancel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveDraft}
            disabled={isPending}
          >
            {isPending && actionType === "draft" ? "Saving..." : "Save draft"}
          </Button>
          <Button size="sm" onClick={handlePublish} disabled={isPending}>
            {isPending && actionType === "publish"
              ? "Publishing..."
              : "Publish"}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        title={config.title}
        desc={config.desc}
        confirmText={config.confirmText}
        handleConfirm={handleConfirm}
        isLoading={isPending}
      />
    </>
  );
}
