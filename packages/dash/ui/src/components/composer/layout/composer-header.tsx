import { useDialogComposerStore } from "@/stores/dialog-composer-store";

export function ComposerHeader() {
  const { pendingContentGroupID } = useDialogComposerStore();
  const isEditing = !!pendingContentGroupID;
  const title = isEditing ? "Edit Content" : "Create Content";

  return (
    <>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      </div>
      {isEditing && (
        <div className="flex items-center gap-2 pb-3 text-sm text-muted-foreground">
          <div className="h-2 w-2 rounded-full bg-orange-500" />
          <span>Editing existing content</span>
        </div>
      )}
    </>
  );
}
