import { Button } from "@openpromo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@openpromo/ui/components/dropdown-menu";
import { MoreVertical, Trash2 } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useActor, useInternal } from "@/hooks/useActor";
import { useWorkspace } from "@/hooks/useWorkspace";
import type { StyleResponse } from "@/queries/styles-queries";
import { useStyleDeleteMutation } from "@/queries/styles-queries";

interface StyleCardActionsProps {
  style: StyleResponse["style"];
}

export function StyleCardActions({ style }: StyleCardActionsProps) {
  const actor = useActor();
  const isInternal = useInternal();
  const { workspace } = useWorkspace();
  const deleteMutation = useStyleDeleteMutation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Only show actions if the current user is the creator
  const isOwner = actor.id === style.creatorID;
  const showActions = isOwner || isInternal;

  if (!showActions) {
    return null;
  }

  const handleDelete = async () => {
    await deleteMutation.mutateAsync({
      styleId: style.id,
      workspaceId: workspace.id,
    });
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenuItem
            onSelect={() => setDeleteDialogOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Style
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Style"
        desc={`Are you sure you want to delete "${style.name}"? This action cannot be undone.`}
        confirmText="Delete"
        destructive
        handleConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}
