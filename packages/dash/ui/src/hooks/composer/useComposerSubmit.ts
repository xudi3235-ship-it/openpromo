import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useComposerPublishHandlers } from "@/hooks/composer/useComposerHooks";
import { validateCaption } from "@/lib/caption-limit";
import { logComposerEvent } from "@/lib/instrumentation/composer";
import { useComposerMutations } from "@/queries/content-orpc";
import {
  resolveHasMediaOrLink,
  resolveSelectedPlatforms,
} from "@/stores/composer/utils/caption";
import { useComposerStore } from "@/stores/composer-store";
import { useDialogComposerStore } from "@/stores/dialog-composer-store";

type ActionType = "draft" | "schedule" | "publish";
type ConfirmDialogType = ActionType | null;
type OverlayStatus = "loading" | "success" | "error";

export interface UseComposerSubmitReturn {
  // Derived state
  actionType: ActionType;
  isPending: boolean;
  canPublish: boolean;

  // Dialog state
  confirmDialog: ConfirmDialogType;
  cancelDialog: boolean;

  // Overlay state
  overlayVisible: boolean;
  overlayStatus: OverlayStatus;

  // Actions - opening dialogs
  saveDraft: () => void;
  publish: () => void;
  cancel: () => void;

  // Actions - confirming/dismissing
  confirmAction: () => void;
  dismissConfirm: () => void;
  confirmCancel: () => void;
  dismissCancel: (open: boolean) => void;
  onOverlayComplete: () => void;

  // Labels
  labels: {
    draft: string;
    publish: string;
  };
}

export function useComposerSubmit(): UseComposerSubmitReturn {
  // ============= State =============
  const [publishingState, setPublishingState] = useState<{
    isVisible: boolean;
    status: OverlayStatus;
  }>({ isVisible: false, status: "loading" });
  const [cancelDialog, setCancelDialog] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogType>(null);

  // ============= Store Access =============
  const composerStore = useComposerStore();
  const {
    setPublishingStatus,
    contentCreateData,
    validation,
    contentGroupID,
    hasUnsavedChanges,
    resetComposer,
    accounts,
    selectedAccounts,
  } = composerStore;

  const { closeComposer } = useDialogComposerStore();
  const onCompleteHandler = useComposerPublishHandlers();

  // ============= Mutations =============
  const { create: useCreateMutation, updateGroup: useUpdateGroupMutation } =
    useComposerMutations();

  // Derive action type from store's publishing status
  const actionType: ActionType = useMemo(() => {
    if (contentCreateData.base.publishingStatus === "DRAFT") return "draft";
    if (contentCreateData.base.publishingStatus === "SCHEDULED")
      return "schedule";
    return "publish";
  }, [contentCreateData.base.publishingStatus]);

  // Message helpers (need to be defined before mutation handlers)
  const getSuccessMessage = useCallback(() => {
    switch (actionType) {
      case "draft":
        return "Draft saved successfully!";
      case "schedule":
        return "Content scheduled successfully!";
      case "publish":
        return "Content is being published. We'll notify you once it's live.";
    }
  }, [actionType]);

  const getErrorMessage = useCallback(() => {
    switch (actionType) {
      case "draft":
        return "Failed to save draft. Please try again.";
      case "schedule":
        return "Failed to schedule content. Please try again.";
      case "publish":
        return "Failed to publish content. Please try again.";
    }
  }, [actionType]);

  // Mutation handlers
  const mutationHandlers = useMemo(
    () => ({
      onSuccess: () => {
        setPublishingState({ isVisible: true, status: "success" });
        toast.success(getSuccessMessage());
      },
      onError: () => {
        setPublishingState({ isVisible: true, status: "error" });
        toast.error(getErrorMessage());
      },
    }),
    [getSuccessMessage, getErrorMessage],
  );

  const createMutation = useCreateMutation(mutationHandlers);
  const updateMutation = useUpdateGroupMutation(mutationHandlers);

  // ============= Derived Values =============
  const isEditFlow = Boolean(contentGroupID);
  const shouldUpdateGroup =
    isEditFlow &&
    (contentCreateData.base.publishingStatus === "DRAFT" ||
      contentCreateData.base.publishingStatus === "SCHEDULED");

  const isPending = shouldUpdateGroup
    ? updateMutation.isPending
    : createMutation.isPending;

  // ============= Analytics Tracking =============
  const selectedPlatforms = useMemo(
    () => resolveSelectedPlatforms(accounts, selectedAccounts),
    [accounts, selectedAccounts],
  );

  const mediaOrLink = useMemo(
    () =>
      resolveHasMediaOrLink(
        contentCreateData.base.attachments,
        contentCreateData.placements.facebookFeed,
      ),
    [
      contentCreateData.base.attachments,
      contentCreateData.placements.facebookFeed,
    ],
  );

  const captionInfo = useMemo(
    () =>
      validateCaption(
        contentCreateData.base.message ?? "",
        selectedPlatforms,
        mediaOrLink,
      ),
    [contentCreateData.base.message, selectedPlatforms, mediaOrLink],
  );

  const hasText = Boolean(contentCreateData.base.message?.trim());
  const lastEventRef = useRef<string | undefined>(undefined);

  // Log composer events on state changes
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

  // ============= Internal Helpers =============
  const triggerMutation = useCallback(() => {
    if (shouldUpdateGroup && contentGroupID) {
      updateMutation.mutate(contentGroupID);
      return;
    }
    createMutation.mutate();
  }, [shouldUpdateGroup, contentGroupID, updateMutation, createMutation]);

  // ============= Actions =============

  // Open draft confirmation dialog
  const saveDraft = useCallback(() => {
    setConfirmDialog("draft");
  }, []);

  // Open publish/schedule confirmation dialog
  const publish = useCallback(() => {
    if (contentCreateData.base.publishingStatus === "SCHEDULED") {
      setConfirmDialog("schedule");
    } else {
      setConfirmDialog("publish");
    }
  }, [contentCreateData.base.publishingStatus]);

  // Handle cancel with unsaved changes check
  const cancel = useCallback(() => {
    if (hasUnsavedChanges()) {
      setCancelDialog(true);
    } else {
      closeComposer();
    }
  }, [hasUnsavedChanges, closeComposer]);

  // Confirm the current action (draft/publish/schedule)
  const confirmAction = useCallback(() => {
    const currentDialog = confirmDialog;
    if (!currentDialog) return;

    if (currentDialog === "draft") {
      setPublishingStatus("DRAFT");
    } else {
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
    }

    setPublishingState({ isVisible: true, status: "loading" });
    setConfirmDialog(null);
    triggerMutation();
  }, [
    confirmDialog,
    setPublishingStatus,
    contentCreateData.base.publishingStatus,
    hasText,
    mediaOrLink,
    selectedPlatforms,
    captionInfo.state,
    triggerMutation,
  ]);

  // Dismiss confirmation dialog
  const dismissConfirm = useCallback(() => {
    setConfirmDialog(null);
  }, []);

  // Confirm cancel (discard changes)
  const confirmCancel = useCallback(() => {
    setCancelDialog(false);
    resetComposer();
    closeComposer();
  }, [resetComposer, closeComposer]);

  // Dismiss cancel dialog
  const dismissCancel = useCallback((open: boolean) => {
    setCancelDialog(open);
  }, []);

  // Handle overlay completion
  const onOverlayComplete = useCallback(() => {
    setPublishingState({ isVisible: false, status: "loading" });
    resetComposer();
    onCompleteHandler();
  }, [resetComposer, onCompleteHandler]);

  // ============= Labels =============
  const labels = useMemo(() => {
    const getDraftLabel = () => {
      if (isPending && actionType === "draft") return "Saving...";
      if (actionType === "schedule") return "Save as draft";
      return "Save draft";
    };

    const getPublishLabel = () => {
      if (
        isPending &&
        (actionType === "publish" || actionType === "schedule")
      ) {
        return actionType === "schedule" ? "Scheduling..." : "Publishing...";
      }
      return actionType === "schedule" ? "Schedule" : "Publish";
    };

    return {
      draft: getDraftLabel(),
      publish: getPublishLabel(),
    };
  }, [isPending, actionType]);

  return {
    // State
    actionType,
    isPending,
    canPublish: validation.canPublish,

    // Dialog state
    confirmDialog,
    cancelDialog,

    // Overlay state
    overlayVisible: publishingState.isVisible,
    overlayStatus: publishingState.status,

    // Actions
    saveDraft,
    publish,
    cancel,
    confirmAction,
    dismissConfirm,
    confirmCancel,
    dismissCancel,
    onOverlayComplete,

    // Labels
    labels,
  };
}
