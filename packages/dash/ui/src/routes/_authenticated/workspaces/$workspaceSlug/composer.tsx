import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { ComposerLeft } from "@/components/composer/composer-left";
import { ComposerNullState } from "@/components/composer/composer-null-state";
import { ComposerRight } from "@/components/composer/composer-right";
import { ComposerSkeleton } from "@/components/composer/composer-skeleton";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useHonoMutation } from "@/lib/hono-client";
import { handlePopupMessage, openPopup } from "@/lib/popup";
import { ComposerProvider } from "@/providers/composer-provider";
import { useConnectedAccounts } from "@/queries/connected-account";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/composer",
)({
  component: ComposerComponent,
});

function ComposerComponent() {
  const { data, isLoading } = useConnectedAccounts();
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  useEffect(() => {
    function handleMessage(event: MessageEvent<unknown>) {
      const payload = handlePopupMessage(event, "accounts_connected");
      if (!payload) return;

      queryClient.invalidateQueries({
        queryKey: [workspace.slug, "connected_accounts"],
      });
      toast[payload.status](payload.message);
    }

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [queryClient, workspace.slug]);

  // Facebook OAuth mutation
  const { mutate: initiateFacebookOAuth, isPending: isConnectingFacebook } =
    useHonoMutation({
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

  // Instagram OAuth mutation
  const { mutate: initiateInstagramOAuth, isPending: isConnectingInstagram } =
    useHonoMutation({
      mutationFn: (api, variables: { state?: string }) =>
        api.workspaces[":workspaceSlug"].connected_accounts.instagram.auth.$get(
          {
            query: { state: variables.state },
            param: { workspaceSlug: workspace.slug },
          },
        ),
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

  const handleConnectFacebook = () => {
    initiateFacebookOAuth({});
  };

  const handleConnectInstagram = () => {
    initiateInstagramOAuth({});
  };

  const isConnecting = isConnectingFacebook || isConnectingInstagram;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex max-w-7xl mx-auto">
          <ComposerSkeleton />
        </div>
      </div>
    );
  }

  // Show null state when no accounts are connected
  if (!data?.accounts || data.accounts.length !== 0) {
    return (
      <ComposerNullState
        onConnectFacebook={handleConnectFacebook}
        onConnectInstagram={handleConnectInstagram}
        isConnecting={isConnecting}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex max-w-7xl mx-auto">
        <ComposerProvider
          initialAccounts={data.accounts}
          initialPlacementSelected="ALL"
          initialSelectedPreview="FACEBOOK"
          initialMessage="Hello world!"
        >
          <ComposerLeft />
          <ComposerRight />
        </ComposerProvider>
      </div>
    </div>
  );
}
