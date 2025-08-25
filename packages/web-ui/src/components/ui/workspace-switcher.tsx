"use client";

import { useNavigate, useRouter } from "@tanstack/react-router";
import { ChevronsUpDown, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useHonoMutation, type Workspace } from "@/lib/hono-client";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

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
  const navigate = useNavigate();
  const router = useRouter();

  const setDefaultWorkspaceMutation = useHonoMutation({
    mutationFn: (api, workspaceSlug: string) =>
      api.users.metadata.$patch({
        json: {
          defaultWorkspaceSlug: workspaceSlug,
        },
      }),
    onSuccess: (_, workspaceSlug) => {
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
    navigate({
      to: "/workspaces/$workspaceSlug",
      params: { workspaceSlug: workspace.slug },
    });
  };

  const handleSetDefaultWorkspace = (workspace: Workspace) => {
    if (workspace.slug === defaultWorkspaceSlug) {
      return;
    }
    setDefaultWorkspaceMutation.mutate(workspace.slug);
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
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  {currentWorkspace.name.charAt(0)}
                </div>
              )}
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {currentWorkspace
                    ? currentWorkspace.name
                    : "Select a workspace"}
                </span>
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
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  {workspace.name.charAt(0)}
                </div>
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
                          disabled={setDefaultWorkspaceMutation.isPending}
                        >
                          {defaultWorkspaceSlug === workspace.slug ? (
                            <Star className="size-3 fill-yellow-400 text-yellow-400" />
                          ) : setDefaultWorkspaceMutation.isPending ? (
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
                navigate({ to: "/workspaces/new" });
              }}
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">
                Add workspace
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
