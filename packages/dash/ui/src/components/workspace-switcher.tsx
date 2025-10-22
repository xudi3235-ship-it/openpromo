"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@openpromo/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@openpromo/ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@openpromo/ui/components/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@openpromo/ui/components/tooltip";
import { cn } from "@openpromo/ui/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { ChevronsUpDown, Plus, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { type User, useHonoMutation, type Workspace } from "@/lib/hono-client";
import { QUERY_KEYS } from "@/lib/query";
import { Route as WorkspacesRoute } from "@/routes/_authenticated/workspaces/route";
import { NewWorkspaceModal } from "./new-workspace-modal";

interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
  currentWorkspaceSlug: string | undefined;
  defaultWorkspaceSlug: string | null | undefined;
}

export function WorkspaceSwitcher({
  workspaces,
  currentWorkspaceSlug,
  defaultWorkspaceSlug,
}: WorkspaceSwitcherProps) {
  const { isMobile } = useSidebar();
  const navigate = WorkspacesRoute.useNavigate();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isNewWorkspaceModalOpen, setIsNewWorkspaceModalOpen] = useState(false);
  const [pendingDefaultSlug, setPendingDefaultSlug] = useState<string | null>(
    null,
  );

  const setDefaultWorkspaceMutation = useHonoMutation({
    mutationFn: (api, workspaceSlug: string) =>
      api.users.metadata.$patch({
        json: {
          defaultWorkspaceSlug: workspaceSlug,
        },
      }),
    onSuccess: (_, workspaceSlug) => {
      queryClient.setQueryData(QUERY_KEYS.USER, (old: User) => ({
        ...old,
        defaultWorkspaceSlug: workspaceSlug,
      }));
      router.invalidate();
      const workspace = workspaces.find((w) => w.slug === workspaceSlug);
      toast.success(`${workspace?.name || "Workspace"} set as default`);
    },
  });

  const currentWorkspace = workspaces.find(
    (workspace) => workspace.slug === currentWorkspaceSlug,
  );

  const handleSwitchWorkspace = (workspace: Workspace) => {
    if (workspace.slug === currentWorkspaceSlug) {
      return;
    }
    if (!currentWorkspaceSlug) {
      navigate({
        to: "/workspaces/$workspaceSlug",
        params: { workspaceSlug: workspace.slug },
      });
      return;
    }
    navigate({
      params: (old) => ({
        ...old,
        workspaceSlug: workspace.slug,
      }),
    });
  };

  const handleSetDefaultWorkspace = (workspace: Workspace) => {
    if (workspace.slug === defaultWorkspaceSlug) {
      return;
    }
    setPendingDefaultSlug(workspace.slug);
    setDefaultWorkspaceMutation.mutate(workspace.slug, {
      onSettled: () => {
        setPendingDefaultSlug(null);
      },
    });
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              {currentWorkspace && (
                <Avatar className="size-8">
                  {currentWorkspace.profilePictureUrl ? (
                    <AvatarImage
                      src={currentWorkspace.profilePictureUrl}
                      alt={`${currentWorkspace.name} avatar`}
                    />
                  ) : null}
                  <AvatarFallback className="text-sm">
                    {currentWorkspace.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {currentWorkspace
                    ? currentWorkspace.name
                    : "Select a workspace"}
                </span>
                {currentWorkspace && (
                  <span className="text-xs text-sidebar-accent-foreground truncate">
                    workspace
                  </span>
                )}
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Workspaces
            </DropdownMenuLabel>
            {workspaces.map((workspace) => (
              <DropdownMenuItem
                key={workspace.name}
                onClick={() => handleSwitchWorkspace(workspace)}
                className={cn(
                  "gap-2 p-2",
                  workspace.slug === currentWorkspaceSlug &&
                    "bg-accent text-accent-foreground",
                )}
              >
                <Avatar className="size-6">
                  {workspace.profilePictureUrl ? (
                    <AvatarImage
                      src={workspace.profilePictureUrl}
                      alt={`${workspace.name} avatar`}
                    />
                  ) : null}
                  <AvatarFallback className="text-xs">
                    {workspace.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    {workspace.name}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetDefaultWorkspace(workspace);
                          }}
                          className="ml-auto rounded p-1 hover:bg-accent disabled:opacity-50 transition-colors"
                          disabled={
                            setDefaultWorkspaceMutation.isPending &&
                            pendingDefaultSlug === workspace.slug
                          }
                        >
                          {defaultWorkspaceSlug === workspace.slug ? (
                            <Star className="size-3 fill-yellow-400 text-yellow-400" />
                          ) : setDefaultWorkspaceMutation.isPending &&
                            pendingDefaultSlug === workspace.slug ? (
                            <div className="size-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                          ) : (
                            <Star className="size-3 text-muted-foreground hover:text-yellow-400 hover:scale-110 transition-all" />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {defaultWorkspaceSlug === workspace.slug
                          ? "Default workspace"
                          : "Set as default workspace"}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 p-2"
              onClick={() => {
                setIsNewWorkspaceModalOpen(true);
              }}
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div>New workspace</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      <NewWorkspaceModal
        open={isNewWorkspaceModalOpen}
        onOpenChange={setIsNewWorkspaceModalOpen}
      />
    </SidebarMenu>
  );
}
