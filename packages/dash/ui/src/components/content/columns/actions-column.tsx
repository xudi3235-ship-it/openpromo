import { Button } from "@openpromo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@openpromo/ui/components/dropdown-menu";
import type { ColumnDef } from "@tanstack/react-table";
import type { MergedContentEntity } from "@worker/routes/api/workspaces/content";
import { Edit, Eye, MoreHorizontal } from "lucide-react";
import { matchEntity } from "@/lib/hono-client";
import { useDialogComposerStore } from "@/stores/dialog-composer-store";

const ActionsCellComponent = ({ entity }: { entity: MergedContentEntity }) => {
  const openDialog = useDialogComposerStore((state) => state.openDialog);

  // Determine the primary action button based on content type and status
  const getPrimaryAction = () => {
    return matchEntity(entity, {
      content: (contentEntity) => {
        const content = contentEntity.entity;
        const isEditable =
          content.publishingStatus === "DRAFT" ||
          content.publishingStatus === "SCHEDULED";

        if (isEditable) {
          return (
            <Button
              size="sm"
              variant="outline"
              onClick={() => openDialog(content.pendingContentGroupId)}
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
          );
        }

        // Published content - show View/Open
        return (
          <Button size="sm" variant="outline" onClick={() => {}}>
            <Eye className="w-4 h-4 mr-1" />
            View
          </Button>
        );
      },
      group: () => {
        // Groups are always editable (drafts or scheduled)
        const group = entity.entity;
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => openDialog(group.id)}
          >
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </Button>
        );
      },
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
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => navigator.clipboard.writeText(entity.entity.id)}
          >
            {matchEntity(entity, {
              content: () => "Copy content ID",
              group: () => "Copy group ID",
            })}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {matchEntity(entity, {
            content: (contentEntity) => {
              const content = contentEntity.entity;
              const isEditable =
                content.publishingStatus === "DRAFT" ||
                content.publishingStatus === "SCHEDULED";

              return (
                <>
                  <DropdownMenuItem>View content</DropdownMenuItem>
                  {isEditable && (
                    <DropdownMenuItem
                      onClick={() => openDialog(content.pendingContentGroupId)}
                    >
                      Edit content
                    </DropdownMenuItem>
                  )}
                  {content.publishingStatus === "SCHEDULED" && (
                    <DropdownMenuItem>Cancel scheduling</DropdownMenuItem>
                  )}
                  {content.publishingStatus === "DRAFT" && (
                    <DropdownMenuItem>Publish now</DropdownMenuItem>
                  )}
                </>
              );
            },
            group: () => {
              const group = entity.entity;
              return (
                <>
                  <DropdownMenuItem>View group</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openDialog(group.id)}>
                    Edit group
                  </DropdownMenuItem>
                  <DropdownMenuItem>Publish now</DropdownMenuItem>
                </>
              );
            },
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export const actionsColumn: ColumnDef<MergedContentEntity> = {
  id: "actions",
  enableHiding: false,
  cell: ({ row }) => <ActionsCellComponent entity={row.original} />,
};
