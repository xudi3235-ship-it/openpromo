import { Button } from "@openpromo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@openpromo/ui/components/dropdown-menu";
import {
  Copy,
  Download,
  ExternalLink,
  MoreVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { RunFeedItem } from "@/features/product-visuals-v2/product-visuals-types";
import { useOpenComposer } from "@/hooks/useOpenComposer";

interface ResultCardActionsProps {
  run: RunFeedItem;
  onDelete?: (run: RunFeedItem) => Promise<void>;
  isDeleting?: boolean;
}

export function ResultCardActions({
  run,
  onDelete,
  isDeleting,
}: ResultCardActionsProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const openComposer = useOpenComposer();

  const firstUrl =
    run.output.output?.videos?.[0]?.videoUrl ||
    run.output.output?.images?.[0]?.imageUrl ||
    run.artifacts?.videos?.[0]?.videoUrl ||
    run.artifacts?.images?.[0]?.imageUrl;

  const handleCopyLink = () => {
    if (!firstUrl) return;
    void navigator.clipboard.writeText(firstUrl);
    toast.success("Link copied to clipboard");
  };

  const handleDownload = () => {
    if (!firstUrl) return;
    const link = document.createElement("a");
    link.href = firstUrl;
    link.download = `output-${run.id}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Download started");
  };

  const handleDelete = () => {
    if (!onDelete) return;
    setDeleteDialogOpen(true);
  };

  const handleCreatePost = () => {
    if (!firstUrl) return;

    // Determine if it's a video or image
    const isVideo =
      run.output.output?.videos?.[0] || run.artifacts?.videos?.[0];

    // Open composer with the media
    openComposer({
      attachments: [
        {
          id: run.id,
          type: isVideo ? "video" : "photo",
          publicUrl: firstUrl,
          mimeType: isVideo ? "video/mp4" : "image/jpeg",
        },
      ],
    });

    toast.success("Media added to composer");
  };

  if (!firstUrl && !onDelete) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {firstUrl && (
            <>
              <DropdownMenuItem asChild>
                <a
                  href={firstUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex cursor-pointer items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Open in new tab</span>
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyLink();
                }}
              >
                <Copy className="h-4 w-4" />
                <span>Copy link</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload();
                }}
              >
                <Download className="h-4 w-4" />
                <span>Download</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleCreatePost();
                }}
              >
                <Plus className="h-4 w-4" />
                <span>Create post with this</span>
              </DropdownMenuItem>
            </>
          )}
          {onDelete && (
            <>
              {firstUrl && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                disabled={isDeleting}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Run"
        desc="Are you sure you want to delete this generated output? This action cannot be undone."
        confirmText="Delete"
        destructive
        handleConfirm={async () => {
          await onDelete?.(run);
          setDeleteDialogOpen(false);
        }}
        isLoading={isDeleting}
      />
    </>
  );
}
