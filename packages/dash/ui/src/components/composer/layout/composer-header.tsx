import { useComposerStore } from "@/stores/composer-store";
import { useDialogComposerStore } from "@/stores/dialog-composer-store";

export function ComposerHeader() {
  const { pendingContentGroupID } = useDialogComposerStore();
  const { contentCreateData } = useComposerStore();

  const isEditing = !!pendingContentGroupID;
  const publishingStatus = contentCreateData.base.publishingStatus;

  const getTitle = () => {
    if (publishingStatus === "SCHEDULED") {
      return isEditing ? "Edit Scheduled Post" : "Schedule Post";
    }
    if (publishingStatus === "DRAFT") {
      return isEditing ? "Edit Draft" : "Save Draft";
    }
    return isEditing ? "Edit Post" : "Create Post";
  };

  return (
    <div className="flex items-center justify-between">
      <h2 className="text-base font-semibold tracking-tight">{getTitle()}</h2>
      {isEditing && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-2 w-2 rounded-full bg-orange-500" />
          <span>Editing existing content</span>
        </div>
      )}
    </div>
  );
}
