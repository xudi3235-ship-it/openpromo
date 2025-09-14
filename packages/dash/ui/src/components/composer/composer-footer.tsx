import { Button } from "@openpromo/ui/components/button";
import { useState } from "react";
import { toast } from "sonner";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useHonoMutation } from "@/lib/hono-client";
import { useComposerStore } from "@/stores/composer-store";
import { PublishingOverlay } from "./publishing-overlay";

function useContentCreateMutation({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void;
  onError?: () => void;
} = {}) {
  const { workspace } = useWorkspace();
  const { contentCreateData } = useComposerStore();
  return useHonoMutation({
    mutationFn: (api) =>
      api.workspaces[":workspaceSlug"].content.create.$post({
        param: { workspaceSlug: workspace.slug },
        json: contentCreateData,
      }),
    onSuccess: () => {
      onSuccess?.();
    },
    onError: () => {
      onError?.();
    },
  });
}

export function ComposerFooter() {
  const [publishingState, setPublishingState] = useState<{
    isVisible: boolean;
    status: "loading" | "success" | "error";
  }>({ isVisible: false, status: "loading" });

  const { setPublishingStatus, contentCreateData } = useComposerStore();

  const { mutate, isPending } = useContentCreateMutation({
    onSuccess: () => {
      setPublishingState({ isVisible: true, status: "success" });
      toast.success(getSuccessMessage());
    },
    onError: () => {
      setPublishingState({ isVisible: true, status: "error" });
      toast.error(getErrorMessage());
    },
  });

  // Derive action type from store's publishing status
  const actionType =
    contentCreateData.base.publishingStatus === "DRAFT"
      ? "draft"
      : contentCreateData.base.publishingStatus === "SCHEDULED"
        ? "schedule"
        : "publish";

  const getSuccessMessage = () => {
    switch (actionType) {
      case "draft":
        return "Draft saved successfully!";
      case "schedule":
        return "Content scheduled successfully!";
      case "publish":
        return "Content published successfully!";
      default:
        return "Action completed successfully!";
    }
  };

  const getErrorMessage = () => {
    switch (actionType) {
      case "draft":
        return "Failed to save draft. Please try again.";
      case "schedule":
        return "Failed to schedule content. Please try again.";
      case "publish":
        return "Failed to publish content. Please try again.";
      default:
        return "Action failed. Please try again.";
    }
  };

  const handleSaveDraft = () => {
    setPublishingStatus("DRAFT");
    setPublishingState({ isVisible: true, status: "loading" });
    mutate({});
  };

  const handlePublish = () => {
    // Only set to PUBLISH_NOW if not already scheduled
    if (contentCreateData.base.publishingStatus !== "SCHEDULED") {
      setPublishingStatus("PUBLISH_NOW");
    }
    setPublishingState({ isVisible: true, status: "loading" });
    mutate({});
  };

  const handleOverlayComplete = () => {
    setPublishingState({ isVisible: false, status: "loading" });
  };

  const data = useComposerStore((s) => s.contentCreateData);

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
      {import.meta.env.DEV && (
        <div className="max-w-md mx-auto my-4 p-2 bg-muted rounded text-xs overflow-auto">
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}

      <PublishingOverlay
        isVisible={publishingState.isVisible}
        status={publishingState.status}
        actionType={actionType}
        onComplete={handleOverlayComplete}
      />
    </>
  );
}
