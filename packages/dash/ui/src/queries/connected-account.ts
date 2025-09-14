import { toast } from "sonner";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useHonoMutation, useHonoQuery } from "@/lib/hono-client";
import { openPopup } from "@/lib/popup";
import { QUERY_KEYS } from "@/lib/query";

export const useConnectedAccounts = () => {
  const { workspace } = useWorkspace();
  return useHonoQuery({
    queryKey: QUERY_KEYS.CONNECTED_ACCOUNTS(workspace.slug),
    queryFn: (api) =>
      api.workspaces[":workspaceSlug"].connected_accounts.$get({
        param: { workspaceSlug: workspace.slug },
      }),
    errorMessage: "Failed to load connected accounts",
    refetchOnMount: true,
  });
};

// Facebook OAuth mutation
export const useFacebookOauthMutation = () => {
  const { workspace } = useWorkspace();
  return useHonoMutation({
    mutationFn: (api, variables: { state?: string }) =>
      api.workspaces[":workspaceSlug"].connected_accounts.facebook.auth.$get({
        query: { state: variables.state },
        param: { workspaceSlug: workspace.slug },
      }),
    onError: (error) => {
      toast.error(`Failed to initiate Facebook OAuth: ${error.message}`);
    },
    onSuccess({ data: { url } }) {
      openPopup({
        url,
        target: "facebook-oauth",
        width: 600,
        height: 800,
      });
    },
  });
};
// Instagram OAuth mutation
export const useInstagramOauthMutation = () => {
  const { workspace } = useWorkspace();
  return useHonoMutation({
    mutationFn: (api, variables: { state?: string }) =>
      api.workspaces[":workspaceSlug"].connected_accounts.instagram.auth.$get({
        query: { state: variables.state },
        param: { workspaceSlug: workspace.slug },
      }),
    onError: (error) => {
      toast.error(`Failed to initiate Instagram OAuth: ${error.message}`);
    },
    onSuccess({ data: { url } }) {
      openPopup({
        url,
        target: "instagram-oauth",
        width: 600,
        height: 800,
      });
    },
  });
};
