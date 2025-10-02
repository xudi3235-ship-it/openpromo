import { Button } from "@openpromo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@openpromo/ui/components/dropdown-menu";
import type { ColumnDef } from "@tanstack/react-table";
import type { MergedContentEntity } from "@worker/routes/api/workspaces/content";
import { Edit, Eye, MoreHorizontal, Trash2, Upload } from "lucide-react";
import { useMemo } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useTableActions } from "@/hooks/content";
import { matchEntity } from "@/lib/hono-client";

const ActionsCellComponent = ({ entity }: { entity: MergedContentEntity }) => {
  const {
    handleEdit,
    handleDelete,
    handlePublish,
    isPublishing,
    showConfirm,
    setShowConfirm,
    deleteConfig,
    handleConfirm,
    isDeleting,
  } = useTableActions();

  // Determine the primary action button based on content type and status
  const contentPermalink = useMemo(() => {
    return matchEntity(entity, {
      content: (contentEntity) => {
        const content = contentEntity.entity;

        if (content.permalinkUrl) return content.permalinkUrl;

        const placementSpec = content.placementSpec as
          | {
              identity?: {
                metadata?: Record<string, unknown>;
                fbPageID?: string;
              };
            }
          | undefined;

        const metadata =
          (placementSpec?.identity?.metadata as
            | Record<string, unknown>
            | undefined) ?? {};

        const metadataUrl = (metadata?.["permalinkUrl"] ??
          metadata?.["shareUrl"] ??
          metadata?.["permalink"]) as string | undefined;
        if (typeof metadataUrl === "string") return metadataUrl;

        return null;
      },
      group: () => null,
    });
  }, [entity]);

  const getPrimaryAction = () => {
    return matchEntity(entity, {
      content: (contentEntity) => {
        const content = contentEntity.entity;
        const isDraftOrScheduled =
          content.publishingStatus === "DRAFT" ||
          content.publishingStatus === "SCHEDULED";

        if (isDraftOrScheduled) {
          return (
            <Button
              size="sm"
              onClick={() => handlePublish(entity)}
              disabled={isPublishing}
            >
              <Upload className="w-4 h-4 mr-1" />
              {isPublishing ? "Publishing..." : "Publish"}
            </Button>
          );
        }

        const handleView = () => {
          if (!contentPermalink) return;
          if (typeof window === "undefined") return;
          window.open(contentPermalink, "_blank", "noopener,noreferrer");
        };

        const isViewDisabled = !contentPermalink;

        return (
          <Button
            size="sm"
            variant="outline"
            onClick={handleView}
            disabled={isViewDisabled}
          >
            <Eye className="w-4 h-4 mr-1" />
            View
          </Button>
        );
      },
      group: () => (
        <Button size="sm" variant="outline" onClick={() => handleEdit(entity)}>
          <Edit className="w-4 h-4 mr-1" />
          Edit
        </Button>
      ),
    });
  };

  return (
    <div className="flex items-center gap-2">
      {getPrimaryAction()}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {matchEntity(entity, {
            content: (contentEntity) => {
              const content = contentEntity.entity;
              const isEditable =
                content.publishingStatus === "DRAFT" ||
                content.publishingStatus === "SCHEDULED";

              return (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      if (!contentPermalink) return;
                      if (typeof window === "undefined") return;
                      window.open(
                        contentPermalink,
                        "_blank",
                        "noopener,noreferrer",
                      );
                    }}
                    disabled={!contentPermalink}
                  >
                    <Eye className="w-4 h-4 mr-1" /> View content
                  </DropdownMenuItem>
                  {isEditable && (
                    <DropdownMenuItem onClick={() => handleEdit(entity)}>
                      <Edit className="w-4 h-4 mr-1" />
                      Edit content
                    </DropdownMenuItem>
                  )}
                  {content.publishingStatus === "SCHEDULED" && (
                    <DropdownMenuItem>Cancel scheduling</DropdownMenuItem>
                  )}
                  {(content.publishingStatus === "DRAFT" ||
                    content.publishingStatus === "SCHEDULED") && (
                    <DropdownMenuItem
                      onClick={() => handlePublish(entity)}
                      disabled={isPublishing}
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      {isPublishing ? "Publishing..." : "Publish now"}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => handleDelete(entity)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete content
                  </DropdownMenuItem>
                </>
              );
            },
            group: () => {
              return (
                <>
                  <DropdownMenuItem onClick={() => handleEdit(entity)}>
                    <Edit className="w-4 h-4 mr-1" />
                    Edit group
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handlePublish(entity)}
                    disabled={isPublishing}
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    {isPublishing ? "Publishing..." : "Publish now"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDelete(entity)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete group
                  </DropdownMenuItem>
                </>
              );
            },
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title={deleteConfig?.title}
        desc={deleteConfig?.description ?? "TODO"}
        confirmText={isDeleting ? "Deleting..." : "Delete"}
        destructive
        isLoading={isDeleting}
        handleConfirm={handleConfirm}
      />
    </div>
  );
};

export const actionsColumn: ColumnDef<MergedContentEntity> = {
  id: "actions",
  enableHiding: false,
  cell: ({ row }) => <ActionsCellComponent entity={row.original} />,
};
