import { Button } from "@openpromo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@openpromo/ui/components/dropdown-menu";
import { useNavigate } from "@tanstack/react-router";
import { MoreVertical, Sparkles, Trash2 } from "lucide-react";
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
  const navigate = useNavigate();
  const deleteMutation = useStyleDeleteMutation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Only show delete action if the current user is the creator
  const isOwner = actor.id === style.creatorID;
  const showDeleteAction = isOwner || isInternal;

  const handleDelete = async () => {
    await deleteMutation.mutateAsync({
      styleId: style.id,
      workspaceId: workspace.id,
    });
    setDeleteDialogOpen(false);
  };

  const handleUseStyle = (e: Event) => {
    e.preventDefault();
    navigate({
      to: "/workspaces/$workspaceSlug/product-visuals",
      params: {
        workspaceSlug: workspace.slug,
      },
      search: {
        styleId: style.id,
      },
    });
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
          <DropdownMenuItem onSelect={handleUseStyle}>
            <Sparkles className="mr-2 h-4 w-4" />
            Use This Style
          </DropdownMenuItem>
          {showDeleteAction && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => setDeleteDialogOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Style
              </DropdownMenuItem>
            </>
          )}
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
