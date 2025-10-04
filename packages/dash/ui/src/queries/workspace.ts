import type { WORKSPACE_ROLE } from "@core/domain/workspace/auth";
import { useQueryClient } from "@tanstack/react-query";
import type {
  WorkspaceTeamInviteResponse,
  WorkspaceTeamInviteRevokeResponse,
  WorkspaceTeamMemberRemoveResponse,
  WorkspaceTeamMemberUpdateResponse,
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.WORKSPACE_MEMBERS(workspace.slug),
      });
    },
  });
};

export const useRevokeWorkspaceInvite = () => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useHonoMutation<
    WorkspaceTeamInviteRevokeResponse,
    { inviteId: string }
  >({
    mutationFn: (api, variables) =>
      api.workspaces[":workspaceSlug"].team.invites[":inviteId"].$delete({
        param: {
          workspaceSlug: workspace.slug,
          inviteId: variables.inviteId,
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.WORKSPACE_MEMBERS(workspace.slug),
      });
    },
  });
};

export type UpdateMemberRoleVariables = {
  memberId: string;
  role: string;
};

export const useUpdateMemberRole = () => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useHonoMutation<
    WorkspaceTeamMemberUpdateResponse,
    UpdateMemberRoleVariables
  >({
    mutationFn: (api, variables) =>
      api.workspaces[":workspaceSlug"].team.members[":memberId"].$patch({
        param: {
          workspaceSlug: workspace.slug,
          memberId: variables.memberId,
        },
        json: {
          role: variables.role as WorkspaceRoleValue,
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.WORKSPACE_MEMBERS(workspace.slug),
      });
    },
  });
};

export const useRemoveMember = () => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useHonoMutation<
    WorkspaceTeamMemberRemoveResponse,
    { memberId: string }
  >({
    mutationFn: (api, variables) =>
      api.workspaces[":workspaceSlug"].team.members[":memberId"].$delete({
        param: {
          workspaceSlug: workspace.slug,
          memberId: variables.memberId,
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.WORKSPACE_MEMBERS(workspace.slug),
      });
    },
  });
};
