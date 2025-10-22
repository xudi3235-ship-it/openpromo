import { Button } from "@openpromo/ui/components/button";
import type { MergedContentEntity } from "@worker/routes/api/workspaces/content";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { matchEntity } from "@/lib/hono-client";
import { useBatchDeleteMutation } from "@/queries/content";

interface BatchActionsToolbarProps {
  selectedRows: MergedContentEntity[];
  onClearSelection: () => void;
}

export function BatchActionsToolbar({
  selectedRows,
  onClearSelection,
}: BatchActionsToolbarProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const batchDeleteMutation = useBatchDeleteMutation(() => {
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

    batchDeleteMutation.mutate(ids);
  };

  return (
    <>
      <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {selectedRows.length} item(s) selected
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={batchDeleteMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Selected
          </Button>
          <Button variant="outline" size="sm" onClick={onClearSelection}>
            Clear Selection
          </Button>
        </div>
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
