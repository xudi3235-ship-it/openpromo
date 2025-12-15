import { Button } from "@openpromo/ui/components/button";
import { useNavigate } from "@tanstack/react-router";
import { Maximize2 } from "lucide-react";
import { useCallback } from "react";
import { MdPublish, MdSaveAlt, MdSchedule } from "react-icons/md";
import { ContentConfirmationDialog } from "@/components/composer/dialogs/content-confirmation-dialog";
import { PublishingOverlay } from "@/components/composer/layout/publishing-overlay";
import { useComposerSubmit } from "@/hooks/composer/useComposerSubmit";
import { useWorkspace } from "@/hooks/useWorkspace";
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
  draftLabel: string;
  publishLabel: string;
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
  draftLabel,
  publishLabel,
  onMoreTools,
  onCancel,
  onSaveDraft,
  onPublish,
}: FooterActionsProps) {
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
        className="text-muted-foreground hover:text-foreground disabled:opacity-50 shrink-0 gap-2"
      >
        <MdSaveAlt className="h-4 w-4 flex-shrink-0" />
        <span className="hidden sm:inline">{draftLabel}</span>
      </Button>
      <Button
        size="sm"
        onClick={onPublish}
        disabled={isPending || !canPublish}
        className="shadow-sm shrink-0 gap-2"
      >
        {actionType === "schedule" ? (
          <MdSchedule className="h-4 w-4 flex-shrink-0" />
        ) : (
          <MdPublish className="h-4 w-4 flex-shrink-0" />
        )}
        <span className="hidden sm:inline">{publishLabel}</span>
      </Button>
    </div>
  );
}

export function ComposerFooter() {
  const submit = useComposerSubmit();
  const { mode, switchToFullscreen } = useDialogComposerStore();
  const ws = useWorkspace();
  const navigate = useNavigate();

  const isDialog = mode !== "closed";
  const showMoreToolsButton = isDialogMode(mode);

  const handleSwitchToFullscreen = useCallback(() => {
    switchToFullscreen();
    navigate({
      to: "/workspaces/$workspaceSlug/composer",
      params: { workspaceSlug: ws.workspace.slug },
    });
  }, [switchToFullscreen, navigate, ws.workspace.slug]);

  return (
    <>
      <FooterActions
        showMoreTools={showMoreToolsButton}
        isDialog={isDialog}
        isPending={submit.isPending}
        canPublish={submit.canPublish}
        actionType={submit.actionType}
        draftLabel={submit.labels.draft}
        publishLabel={submit.labels.publish}
        onMoreTools={handleSwitchToFullscreen}
        onCancel={submit.cancel}
        onSaveDraft={submit.saveDraft}
        onPublish={submit.publish}
      />

      <CancelConfirmationDialog
        open={submit.cancelDialog}
        onOpenChange={submit.dismissCancel}
        onConfirm={submit.confirmCancel}
      />

      {submit.confirmDialog && (
        <ContentConfirmationDialog
          open={true}
          onOpenChange={(open) => !open && submit.dismissConfirm()}
          onConfirm={submit.confirmAction}
          actionType={submit.confirmDialog}
          isPending={submit.isPending}
        />
      )}

      <PublishingOverlay
        isVisible={submit.overlayVisible}
        status={submit.overlayStatus}
        actionType={submit.actionType}
        onComplete={submit.onOverlayComplete}
      />
    </>
  );
}
