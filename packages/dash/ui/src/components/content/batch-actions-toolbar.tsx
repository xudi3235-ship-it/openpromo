import { Button } from "@openpromo/ui/components/button";
import type { MergedContentEntity } from "@worker/shared/content-types";
import { Trash2, X } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { matchEntity } from "@/lib/hono-client";
import { useContentBatchDeleteMutation } from "@/queries/content-orpc";

interface BatchActionsToolbarProps {
  selectedRows: MergedContentEntity[];
  onClearSelection: () => void;
}

export function BatchActionsToolbar({
  selectedRows,
  onClearSelection,
}: BatchActionsToolbarProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const batchDeleteMutation = useContentBatchDeleteMutation(() => {
    onClearSelection();
    setShowDeleteConfirm(false);
  });

  if (selectedRows.length === 0) return null;

  const handleBatchDelete = () => {
    const ids = selectedRows.map((row) =>
      matchEntity(row, {
        group: (entity) => entity.entity.id,
        content: (entity) => entity.entity.id,
      }),
    );

    batchDeleteMutation.mutate({ contentIds: ids });
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {selectedRows.length} selected
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={batchDeleteMutation.isPending}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="text-muted-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Selected Items"
        desc={`Are you sure you want to delete ${selectedRows.length} selected item(s)? This action cannot be undone.`}
        confirmText={batchDeleteMutation.isPending ? "Deleting..." : "Delete"}
        destructive
        handleConfirm={handleBatchDelete}
        isLoading={batchDeleteMutation.isPending}
      />
    </>
  );
}
