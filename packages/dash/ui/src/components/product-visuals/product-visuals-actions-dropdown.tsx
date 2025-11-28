import { Button } from "@openpromo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@openpromo/ui/components/dropdown-menu";
import {
  Download,
  ExternalLink,
  FileText,
  ImageIcon,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { useOpenComposer } from "@/hooks/useOpenComposer";
import type { ProductVisualsFeedResponse } from "@/queries/product-visuals";

type FeedItem = ProductVisualsFeedResponse["items"][number];

interface ProductVisualsActionsDropdownProps {
  item: FeedItem;
  onDelete: () => void;
  onViewVariations?: (item: FeedItem) => void;
  isDeleting: boolean;
  enableComposerActions?: boolean;
  isVariationView?: boolean;
}

export function ProductVisualsActionsDropdown({
  item,
  onDelete,
  onViewVariations,
  isDeleting,
  enableComposerActions = true,
  isVariationView = false,
}: ProductVisualsActionsDropdownProps) {
  const openComposer = useOpenComposer();
  const isVideo = item.type === "video";

  const handleOpen = () => {
    if (item.outputUrl) {
      window.open(item.outputUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleDownload = () => {
    if (item.outputUrl) {
      window.open(item.outputUrl, "_blank");
    }
  };

  const handleCreatePost = () => {
    if (!item.outputUrl) return;

    openComposer({
      attachments: [
        {
          id: item.id,
          type: isVideo ? "video" : "photo",
          publicUrl: item.outputUrl,
          thumbnailUrl: item.previewUrl ?? item.outputUrl,
          mimeType: isVideo ? "video/mp4" : "image/jpeg",
          s3Key: item.id,
        },
      ],
    });
  };

  return (
    <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
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
        <DropdownMenuContent align="end" className="w-44">
          {enableComposerActions && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleCreatePost();
              }}
            >
              <FileText className="mr-2 h-4 w-4" />
              Create post
            </DropdownMenuItem>
          )}
          {!isVariationView && item.type === "image" && onViewVariations && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onViewVariations(item);
              }}
            >
              <ImageIcon className="mr-2 h-4 w-4" />
              View variations
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              handleOpen();
            }}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in new tab
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              handleDownload();
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Download
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            disabled={isDeleting}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
