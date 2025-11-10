import type { QueryClient } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useWorkspace } from "@/hooks/useWorkspace";
import { orpc } from "@/lib/orpc-client";
import { QUERY_KEYS } from "@/lib/query";
import type {
  WorkspacesRouterInputs,
  WorkspacesRouterOutputs,
} from "../../../worker/src/orpc/routes/workspaces";
import type { TeamRouterInputs } from "../../../worker/src/orpc/routes/workspaces/team";

// Export Workspace type for use across the app
export type Workspace = WorkspacesRouterOutputs["list"]["workspaces"][number];

export const prefetchWorkspaceMembers = (
  queryClient: QueryClient,
  workspaceSlug: string,
) => {
  queryClient.prefetchQuery(
    orpc.workspaces.team.list.queryOptions({
      input: { workspaceSlug },
    }),
  );
};

export const useWorkspaceMembers = () => {
  const { workspace } = useWorkspace();

  return useQuery(
    orpc.workspaces.team.list.queryOptions({
      input: {
        workspaceSlug: workspace.slug,
      },
    }),
  );
};

export type InviteWorkspaceMemberVariables = Omit<
  TeamRouterInputs["invite"],
  "workspaceSlug" | "workspaceId"
>;

export const useInviteWorkspaceMember = () => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation(
    orpc.workspaces.team.invite.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.WORKSPACE_MEMBERS(workspace.slug),
        });
      },
      mutationFn: async (input) => {
        return orpc.workspaces.team.invite.call({
          workspaceSlug: workspace.slug,
          email: input.email,
          role: input.role,
        });
      },
    }),
  );
};

export const useRevokeWorkspaceInvite = () => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation(
    orpc.workspaces.team.revokeInvite.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.WORKSPACE_MEMBERS(workspace.slug),
        });
      },
      mutationFn: async (input: { inviteId: string }) => {
        return orpc.workspaces.team.revokeInvite.call({
          workspaceSlug: workspace.slug,
          inviteId: input.inviteId,
        });
      },
    }),
  );
};

export type UpdateMemberRoleVariables = Omit<
  TeamRouterInputs["updateRole"],
  "workspaceSlug" | "workspaceId"
>;

export const useUpdateMemberRole = () => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation(
    orpc.workspaces.team.updateRole.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.WORKSPACE_MEMBERS(workspace.slug),
        });
      },
      mutationFn: async (input) => {
        return orpc.workspaces.team.updateRole.call({
          workspaceSlug: workspace.slug,
          memberId: input.memberId,
          role: input.role,
        });
      },
    }),
  );
};

export const useRemoveMember = () => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation(
    orpc.workspaces.team.remove.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.WORKSPACE_MEMBERS(workspace.slug),
        });
      },
      mutationFn: async (input: { memberId: string }) => {
        return orpc.workspaces.team.remove.call({
          workspaceSlug: workspace.slug,
          memberId: input.memberId,
        });
      },
    }),
  );
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
