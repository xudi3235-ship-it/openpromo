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
    contentCreateData.base.publishingStatus === "DRAFT"
      ? "draft"
      : contentCreateData.base.publishingStatus === "SCHEDULED"
        ? "schedule"
        : "publish";

  const handleSaveDraft = () => {
    setPublishingStatus("DRAFT");
    setShowConfirmDialog(true);
  };

  const handlePublish = () => {
    // Only set to PUBLISH_NOW if not already scheduled
    if (contentCreateData.base.publishingStatus !== "SCHEDULED") {
      setPublishingStatus("PUBLISH_NOW");
    }
    setShowConfirmDialog(true);
  };

  const handleConfirm = () => {
    mutate({});
  };

  const getScheduledDateTime = () => {
    if (contentCreateData.base.schedulingSpec?.publishAt) {
      return new Date(
        contentCreateData.base.schedulingSpec.publishAt,
      ).toLocaleString();
    }
    return "the scheduled time";
  };

  const dialogConfig = {
    draft: {
      title: "Save Draft",
      desc: "Are you sure you want to save this content as a draft? You can publish it later.",
      confirmText: "Save Draft",
    },
    schedule: {
      title: "Schedule Content",
      desc: `Are you sure you want to schedule this content for ${getScheduledDateTime()}?`,
      confirmText: "Schedule",
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
            {isPending &&
            (actionType === "publish" || actionType === "schedule")
              ? actionType === "schedule"
                ? "Scheduling..."
                : "Publishing..."
              : actionType === "schedule"
                ? "Schedule"
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
