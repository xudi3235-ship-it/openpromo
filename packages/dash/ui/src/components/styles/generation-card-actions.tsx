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
import { useWorkspace } from "@/hooks/useWorkspace";
import type { StyleGenerationsResponse } from "@/queries/styles-queries";
import { useStyleGenerationDeleteMutation } from "@/queries/styles-queries";

type Generation = StyleGenerationsResponse["generations"][number];

interface GenerationCardActionsProps {
  generation: Generation;
  styleName: string;
}

export function GenerationCardActions({
  generation,
  styleName,
}: GenerationCardActionsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const styleId = generation.styleComponentId ?? undefined;
  const deleteMutation = useStyleGenerationDeleteMutation(styleId);
  const { workspace } = useWorkspace();

  if (!styleId) {
    return null;
  }

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync({
        workspaceId: workspace.id,
        styleId,
        generationId: generation.id,
      });
      setDialogOpen(false);
    } catch {
      // keep dialog open so the user can retry if needed
    }
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 bg-black/50 text-white hover:bg-black/70"
            onClick={handleOpenMenu}
            disabled={deleteMutation.isPending}
          >
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Open generation menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-44"
          onClick={(event) => event.stopPropagation()}
        >
          <DropdownMenuItem
            onSelect={() => setDialogOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete generation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Delete generation"
        desc={`This will permanently remove the selected generation from "${styleName}".`}
        confirmText="Delete"
        destructive
        handleConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}
