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
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useTableActions } from "@/hooks/content";
import { matchEntity } from "@/lib/hono-client";

const ActionsCellComponent = ({ entity }: { entity: MergedContentEntity }) => {
  const {
    handleEdit,
    handleDelete,
    handlePublish,
    handleView,
    getPermalink,
    isEditable,
    canPublish,
    editLabel,
    deleteLabel,
    isPublishing,
    showConfirm,
    setShowConfirm,
    deleteConfig,
    handleConfirm,
    isDeleting,
  } = useTableActions();

  const contentPermalink = getPermalink(entity);
  const isEntityEditable = isEditable(entity);
  const canEntityPublish = canPublish(entity);

  const renderPrimaryAction = () =>
    matchEntity(entity, {
      content: () => {
        if (canEntityPublish) {
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

        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleView(entity)}
            disabled={!contentPermalink}
          >
            <Eye className="w-4 h-4 mr-1" />
            View
          </Button>
        );
      },
      group: () => (
        <Button size="sm" variant="outline" onClick={() => handleEdit(entity)}>
          <Edit className="w-4 h-4 mr-1" />
          {editLabel(entity)}
        </Button>
      ),
    });

  const renderMenuItems = () =>
    matchEntity(entity, {
      content: (contentEntity) => {
        const status = contentEntity.entity.publishingStatus;
        return (
          <>
            <DropdownMenuItem
              onClick={() => handleView(entity)}
              disabled={!contentPermalink}
            >
              <Eye className="w-4 h-4 mr-2" /> View content
            </DropdownMenuItem>
            {isEntityEditable && (
              <DropdownMenuItem onClick={() => handleEdit(entity)}>
                <Edit className="w-4 h-4 mr-2" />
                {editLabel(entity)}
              </DropdownMenuItem>
            )}
            {status === "SCHEDULED" && (
              <DropdownMenuItem disabled>Cancel scheduling</DropdownMenuItem>
            )}
            {canEntityPublish && (
              <DropdownMenuItem
                onClick={() => handlePublish(entity)}
                disabled={isPublishing}
              >
                <Upload className="w-4 h-4 mr-2" />
                {isPublishing ? "Publishing..." : "Publish now"}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => handleDelete(entity)}
              className="text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {deleteLabel(entity)}
            </DropdownMenuItem>
          </>
        );
      },
      group: () => (
        <>
          <DropdownMenuItem onClick={() => handleEdit(entity)}>
            <Edit className="w-4 h-4 mr-2" />
            {editLabel(entity)}
          </DropdownMenuItem>
          {canEntityPublish && (
            <DropdownMenuItem
              onClick={() => handlePublish(entity)}
              disabled={isPublishing}
            >
              <Upload className="w-4 h-4 mr-2" />
              {isPublishing ? "Publishing..." : "Publish now"}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => handleDelete(entity)}
            className="text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {deleteLabel(entity)}
          </DropdownMenuItem>
        </>
      ),
    });

  return (
    <div className="flex items-center gap-2">
      {renderPrimaryAction()}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {renderMenuItems()}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title={deleteConfig?.title}
        desc={deleteConfig?.description ?? "This action cannot be undone."}
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
