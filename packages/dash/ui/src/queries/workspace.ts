import type { WORKSPACE_ROLE } from "@core/domain/workspace/auth";
import { useQueryClient } from "@tanstack/react-query";
import type {
  WorkspaceTeamInviteResponse,
  WorkspaceTeamResponse,
} from "@worker/routes/api/workspaces/team";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useHonoMutation, useHonoQuery } from "@/lib/hono-client";
import { QUERY_KEYS } from "@/lib/query";

export const useWorkspaceMembers = () => {
  const { workspace } = useWorkspace();

  return useHonoQuery<WorkspaceTeamResponse>({
    queryKey: QUERY_KEYS.WORKSPACE_MEMBERS(workspace.slug),
    queryFn: (api) =>
      api.workspaces[":workspaceSlug"].team.$get({
        param: { workspaceSlug: workspace.slug },
      }),
    errorMessage: "Failed to load workspace members",
    refetchOnMount: true,
  });
};

type WorkspaceRoleValue = (typeof WORKSPACE_ROLE)[keyof typeof WORKSPACE_ROLE];

export type InviteWorkspaceMemberVariables = {
  email: string;
  role: WorkspaceRoleValue;
};

export const useInviteWorkspaceMember = () => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useHonoMutation<
    WorkspaceTeamInviteResponse,
    InviteWorkspaceMemberVariables
  >({
    mutationFn: (api, variables) =>
      api.workspaces[":workspaceSlug"].team.$post({
        param: { workspaceSlug: workspace.slug },
        json: variables,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.WORKSPACE_MEMBERS(workspace.slug),
      });
    },
  });
};
