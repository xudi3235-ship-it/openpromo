import { Button } from "@openpromo/ui/components/button";
import { useNavigate } from "@tanstack/react-router";
import { Maximize2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ValidationErrors } from "@/components/composer/controls/validation-errors";
import { PublishingOverlay } from "@/components/composer/layout/publishing-overlay";
import { useComposerPublishHandlers } from "@/hooks/composer/useComposerHooks";
import { useWorkspace } from "@/hooks/useWorkspace";
import { validateCaption } from "@/lib/caption-limit";
import { logComposerEvent } from "@/lib/instrumentation/composer";
import { useComposerMutations } from "@/queries/content";
import {
  resolveHasMediaOrLink,
  resolveSelectedPlatforms,
} from "@/stores/composer/utils/caption";
import { useComposerStore } from "@/stores/composer-store";
import {
  isDialogMode,
  useDialogComposerStore,
} from "@/stores/dialog-composer-store";
import { CancelConfirmationDialog } from "../dialogs/cancel-confirmation-dialog";

// ============= Footer Actions =============
interface FooterActionsProps {
  showMoreTools: boolean;
  isDialog: boolean;
  isPending: boolean;
  canPublish: boolean;
  actionType: "draft" | "schedule" | "publish";
  onMoreTools: () => void;
  onCancel: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
}

function FooterActions({
  showMoreTools,
  isDialog,
  isPending,
  canPublish,
  actionType,
  onMoreTools,
  onCancel,
  onSaveDraft,
  onPublish,
}: FooterActionsProps) {
  const getDraftLabel = () => {
    if (isPending && actionType === "draft") return "Saving...";
    return "Save draft";
  };

  const getPublishLabel = () => {
    if (isPending && (actionType === "publish" || actionType === "schedule")) {
      return actionType === "schedule" ? "Scheduling..." : "Publishing...";
    }
    return actionType === "schedule" ? "Schedule" : "Publish";
  };

  return (
    <div className="flex items-center justify-end gap-2 min-w-0">
      {showMoreTools && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onMoreTools}
          className="gap-2 text-muted-foreground hover:text-foreground shrink-0"
        >
          <Maximize2 className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="hidden sm:inline">More tools</span>
        </Button>
      )}
      {isDialog && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="shrink-0"
        >
          Cancel
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={onSaveDraft}
        disabled={isPending || !canPublish}
        className="text-muted-foreground hover:text-foreground disabled:opacity-50 shrink-0"
      >
        {getDraftLabel()}
      </Button>
      <Button
        size="sm"
        onClick={onPublish}
        disabled={isPending || !canPublish}
        className="shadow-sm shrink-0"
      >
        {getPublishLabel()}
      </Button>
    </div>
  );
}

export function ComposerFooter() {
  const [publishingState, setPublishingState] = useState<{
    isVisible: boolean;
    status: "loading" | "success" | "error";
  }>({ isVisible: false, status: "loading" });
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const composerStore = useComposerStore();
  const {
    setPublishingStatus,
    contentCreateData,
    validation,
    contentGroupID,
    hasUnsavedChanges,
  } = composerStore;
  const { mode, closeComposer, switchToFullscreen } = useDialogComposerStore();
  const isDialog = mode !== "closed";
  const showMoreToolsButton = isDialogMode(mode);
  const onCompleteHandler = useComposerPublishHandlers();
  const ws = useWorkspace();
  const navigate = useNavigate();

  const { create: useCreateMutation, updateGroup: useUpdateGroupMutation } =
    useComposerMutations();

  const selectedPlatforms = useMemo(
    () =>
      resolveSelectedPlatforms(
        composerStore.accounts,
        composerStore.selectedAccounts,
      ),
    [composerStore.accounts, composerStore.selectedAccounts],
  );
  const mediaOrLink = useMemo(
    () =>
      resolveHasMediaOrLink(
        composerStore.contentCreateData.base.attachments,
        composerStore.contentCreateData.placements.facebookFeed,
      ),
    [
      composerStore.contentCreateData.base.attachments,
      composerStore.contentCreateData.placements.facebookFeed,
    ],
  );
  const captionInfo = useMemo(
    () =>
      validateCaption(
        composerStore.contentCreateData.base.message ?? "",
        selectedPlatforms,
        mediaOrLink,
      ),
    [
      composerStore.contentCreateData.base.message,
      selectedPlatforms,
      mediaOrLink,
    ],
  );
  const hasText = Boolean(contentCreateData.base.message?.trim());
  const lastEventRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const signature = [
      hasText ? "1" : "0",
      mediaOrLink ? "1" : "0",
      captionInfo.state,
      selectedPlatforms.join(","),
    ].join("|");
    if (signature === lastEventRef.current) return;
    lastEventRef.current = signature;
    logComposerEvent({
      has_text: hasText,
      has_media: mediaOrLink,
      platforms: selectedPlatforms,
      validation: captionInfo.state,
    });
  }, [hasText, mediaOrLink, selectedPlatforms, captionInfo.state]);

  // Handler to switch to fullscreen and navigate
  const handleSwitchToFullscreen = useCallback(() => {
    switchToFullscreen();
    navigate({
      to: "/workspaces/$workspaceSlug/composer",
      params: { workspaceSlug: ws.workspace.slug },
    });
  }, [switchToFullscreen, navigate, ws.workspace.slug]);

  // Derive action type from store's publishing status
  const actionType =
    contentCreateData.base.publishingStatus === "DRAFT"
      ? "draft"
      : contentCreateData.base.publishingStatus === "SCHEDULED"
        ? "schedule"
        : "publish";

  const mutationHandlers = {
    onSuccess: () => {
      setPublishingState({ isVisible: true, status: "success" });
      toast.success(getSuccessMessage());
    },
    onError: () => {
      setPublishingState({ isVisible: true, status: "error" });
      toast.error(getErrorMessage());
    },
  } as const;

  const createMutation = useCreateMutation(mutationHandlers);
  const updateMutation = useUpdateGroupMutation(mutationHandlers);

  const isEditFlow = Boolean(contentGroupID);
  const shouldUpdateGroup =
    isEditFlow &&
    (contentCreateData.base.publishingStatus === "DRAFT" ||
      contentCreateData.base.publishingStatus === "SCHEDULED");

  const triggerMutation = () => {
    if (shouldUpdateGroup && contentGroupID) {
      updateMutation.mutate(contentGroupID);
      return;
    }

    createMutation.mutate({});
  };

  const isPending = shouldUpdateGroup
    ? updateMutation.isPending
    : createMutation.isPending;

  const getSuccessMessage = () => {
    switch (actionType) {
      case "draft":
        return "Draft saved successfully!";
      case "schedule":
        return "Content scheduled successfully!";
      case "publish":
        return "Content is being published. We'll notify you once it's live.";
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
    triggerMutation();
  };

  const handlePublish = () => {
    // Only set to PUBLISH_NOW if not already scheduled
    if (contentCreateData.base.publishingStatus !== "SCHEDULED") {
      setPublishingStatus("PUBLISH_NOW");
    }
    logComposerEvent({
      has_text: hasText,
      has_media: mediaOrLink,
      platforms: selectedPlatforms,
      validation: captionInfo.state,
      action: "publish_click",
    });
    setPublishingState({ isVisible: true, status: "loading" });
    triggerMutation();
  };

  const handleOverlayComplete = () => {
    setPublishingState({ isVisible: false, status: "loading" });
    onCompleteHandler();
  };

  const handleCancel = useCallback(() => {
    if (hasUnsavedChanges()) {
      setShowCancelConfirm(true);
    } else {
      closeComposer();
    }
  }, [hasUnsavedChanges, closeComposer]);

  const handleConfirmCancel = () => {
    setShowCancelConfirm(false);
    closeComposer();
  };

  const data = useComposerStore((s) => s.contentCreateData);

  return (
    <>
      <div className="space-y-3 rounded-xl border border-border/60 bg-background/60 p-4">
        <FooterActions
          showMoreTools={showMoreToolsButton}
          isDialog={isDialog}
          isPending={isPending}
          canPublish={validation.canPublish}
          actionType={actionType}
          onMoreTools={handleSwitchToFullscreen}
          onCancel={handleCancel}
          onSaveDraft={handleSaveDraft}
          onPublish={handlePublish}
        />

        <ValidationErrors errors={validation.errors} />
      </div>

      <CancelConfirmationDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        onConfirm={handleConfirmCancel}
      />
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
