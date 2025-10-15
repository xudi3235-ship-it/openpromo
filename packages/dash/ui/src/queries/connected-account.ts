import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { useWorkspace } from "@/hooks/useWorkspace";
import { convertHonoQueryOptions, useHonoMutation } from "@/lib/hono-client";
import { handlePopupMessage, openPopup } from "@/lib/popup";
import { QUERY_KEYS } from "@/lib/query";

const queryOpts = (workspaceSlug: string) => {
  return convertHonoQueryOptions({
    queryKey: QUERY_KEYS.CONNECTED_ACCOUNTS(workspaceSlug),
    queryFn: (api) =>
      api.workspaces[":workspaceSlug"].connected_accounts.$get({
        param: { workspaceSlug },
      }),
    errorMessage: "Failed to load connected accounts",
    staleTime: 1000 * 60 * 5, // 5 minutes - connected accounts don't change frequently
  });
};

export const prefetchConnectedAccounts = (
  queryClient: ReturnType<typeof useQueryClient>,
  workspaceSlug: string,
) => {
  // do not await
  queryClient.prefetchQuery(queryOpts(workspaceSlug));
};

// Hook to fetch connected accounts

export const useConnectedAccounts = () => {
  const { workspace } = useWorkspace();
  const opts = queryOpts(workspace.slug);
  const query = useQuery(opts);

  return {
    accounts: query.data?.accounts || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
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

export const useTikTokOauthMutation = () => {
  const { workspace } = useWorkspace();
  return useHonoMutation({
    mutationFn: (api, variables: { state?: string }) =>
      api.workspaces[":workspaceSlug"].connected_accounts.tiktok.auth.$get({
        query: { state: variables.state },
        param: { workspaceSlug: workspace.slug },
      }),
    onError: (error) => {
      toast.error(`Failed to initiate TikTok OAuth: ${error.message}`);
    },
    onSuccess({ data: { url } }) {
      openPopup({
        url,
        target: "tiktok-oauth",
        width: 600,
        height: 800,
      });
    },
  });
};

const useDeleteConnectedAccountMutation = () => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  return useHonoMutation({
    mutationFn: (api, variables: { accountId: string }) =>
      api.workspaces[":workspaceSlug"].connected_accounts[":accountId"].$delete(
        {
          param: {
            workspaceSlug: workspace.slug,
            accountId: variables.accountId,
          },
        },
      ),
    onError: (error) => {
      toast.error(`Failed to disconnect account: ${error.message}`);
    },
    onSuccess: () => {
      toast.success(`Account disconnected`);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.CONNECTED_ACCOUNTS(workspace.slug),
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
    async function handleMessage(event: MessageEvent<unknown>) {
      const payload = handlePopupMessage(event, "accounts_connected");
      if (!payload) return;

      await queryClient.invalidateQueries({
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
  const tikTokMutation = useTikTokOauthMutation();
  const deleteConnectedAccountMutation = useDeleteConnectedAccountMutation();

  const handleConnectFacebook = () => {
    facebookMutation.mutate({});
  };

  const handleConnectInstagram = () => {
    instagramMutation.mutate({});
  };

  const handleConnectTikTok = () => {
    tikTokMutation.mutate({});
  };

  const isConnecting =
    facebookMutation.isPending ||
    instagramMutation.isPending ||
    tikTokMutation.isPending ||
    deleteConnectedAccountMutation.isPending;

  return {
    handleConnectFacebook,
    handleConnectInstagram,
    handleConnectTikTok,
    isConnecting,
    isConnectingFacebook: facebookMutation.isPending,
    isConnectingInstagram: instagramMutation.isPending,
    isConnectingTikTok: tikTokMutation.isPending,
    deleteConnectedAccount: deleteConnectedAccountMutation.mutate,
  };
};
