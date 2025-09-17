import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useHonoMutation, useHonoQuery } from "@/lib/hono-client";
import { handlePopupMessage, openPopup } from "@/lib/popup";
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

// Combined OAuth hook with message listener
export const useOAuthWithListener = () => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  // Setup message listener for OAuth callbacks
  useEffect(() => {
    function handleMessage(event: MessageEvent<unknown>) {
      const payload = handlePopupMessage(event, "accounts_connected");
      if (!payload) return;

      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.CONNECTED_ACCOUNTS(workspace.slug),
      });
      toast[payload.status](payload.message);
    }

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [queryClient, workspace.slug]);

  const facebookMutation = useFacebookOauthMutation();
  const instagramMutation = useInstagramOauthMutation();

  const handleConnectFacebook = () => {
    facebookMutation.mutate({});
  };

  const handleConnectInstagram = () => {
    instagramMutation.mutate({});
  };

  const isConnecting =
    facebookMutation.isPending || instagramMutation.isPending;

  return {
    handleConnectFacebook,
    handleConnectInstagram,
    isConnecting,
    isConnectingFacebook: facebookMutation.isPending,
    isConnectingInstagram: instagramMutation.isPending,
  };
};
