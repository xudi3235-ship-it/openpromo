import { Button } from "@openpromo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@openpromo/ui/components/dropdown-menu";
import { Download, Edit3, MoreVertical, Trash2 } from "lucide-react";
import type { ImageGenListResponse } from "@/queries/image-gen";

type Generation = NonNullable<ImageGenListResponse["generations"]>[number];

interface GenerationCardActionsProps {
  generation: Generation;
  onEdit?: (generation: Generation) => void;
  onDelete?: (generation: Generation) => void;
  onDownload?: (generation: Generation) => void;
}

export function GenerationCardActions({
  generation,
  onEdit,
  onDelete,
  onDownload,
}: GenerationCardActionsProps) {
  const handleDownload = () => {
    const imageUrl = generation.outputImages?.[0];
    if (imageUrl) {
      window.open(imageUrl, "_blank");
    }
    onDownload?.(generation);
  };

  const isCompleted = generation.state === "completed";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 bg-background/90 hover:bg-background backdrop-blur-sm shadow-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-3.5 w-3.5" />
          <span className="sr-only">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {isCompleted && onEdit && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onEdit(generation);
            }}
          >
            <Edit3 className="mr-2 h-4 w-4" />
            Fine tune
          </DropdownMenuItem>
        )}
        {isCompleted && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              handleDownload();
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Download
          </DropdownMenuItem>
        )}
        {isCompleted && onDelete && <DropdownMenuSeparator />}
        {onDelete && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onDelete(generation);
            }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
