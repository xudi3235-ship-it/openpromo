import type { WORKSPACE_ROLE } from "@shared/workspace/auth";
import type { QueryClient } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import type {
  WorkspaceTeamInviteResponse,
  WorkspaceTeamInviteRevokeResponse,
  WorkspaceTeamMemberRemoveResponse,
  WorkspaceTeamMemberUpdateResponse,
  WorkspaceTeamResponse,
} from "@worker/routes/api/workspaces/team";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  convertHonoQueryOptions,
  useHonoMutation,
  useHonoQuery,
} from "@/lib/hono-client";
import { orpc } from "@/lib/orpc-client";
import { QUERY_KEYS } from "@/lib/query";
import type {
  WorkspacesRouterInputs,
  WorkspacesRouterOutputs,
} from "../../../worker/src/orpc/routes/workspaces";

// Export Workspace type for use across the app
export type Workspace = WorkspacesRouterOutputs["list"]["workspaces"][number];

const workspaceMembersQueryOpts = (workspaceSlug: string) => ({
  queryKey: QUERY_KEYS.WORKSPACE_MEMBERS(workspaceSlug),
  queryFn: (api: typeof import("@/lib/hono-client").apiClient) =>
    api.workspaces[":workspaceSlug"].team.$get({
      param: { workspaceSlug },
    }),
});

export const prefetchWorkspaceMembers = (
  queryClient: QueryClient,
  workspaceSlug: string,
) => {
  queryClient.prefetchQuery(
    convertHonoQueryOptions(workspaceMembersQueryOpts(workspaceSlug)),
  );
};

export const useWorkspaceMembers = () => {
  const { workspace } = useWorkspace();

  return useHonoQuery<WorkspaceTeamResponse>({
    ...workspaceMembersQueryOpts(workspace.slug),
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

export type UpdateWorkspacePayload = Omit<
  WorkspacesRouterInputs["update"],
  "workspaceSlug"
>;

export const useUpdateWorkspace = () => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation(
    orpc.workspaces.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.WORKSPACES,
        });
        await router.invalidate();
      },
      mutationFn: async (input) => {
        return orpc.workspaces.update.call({
          workspaceSlug: workspace.slug,
          ...input,
        });
      },
    }),
  );
};
