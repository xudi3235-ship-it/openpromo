import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { ComposerNullState } from "@/components/composer/composer-null-state";
import { ComposerSkeleton } from "@/components/composer/composer-skeleton";
import { ResizableComposer } from "@/components/composer/resizable-composer";
import { useWorkspace } from "@/hooks/useWorkspace";
import { handlePopupMessage } from "@/lib/popup";
import { QUERY_KEYS } from "@/lib/query";
import {
  useConnectedAccounts,
  useFacebookOauthMutation,
  useInstagramOauthMutation,
} from "@/queries/connected-account";

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
        queryKey: QUERY_KEYS.CONNECTED_ACCOUNTS(workspace.slug),
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
    useFacebookOauthMutation();

  // Instagram OAuth mutation
  const { mutate: initiateInstagramOAuth, isPending: isConnectingInstagram } =
    useInstagramOauthMutation();

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
  if (!data?.accounts || data.accounts.length === 0) {
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
      <ResizableComposer accounts={data.accounts} className="min-h-screen" />
    </div>
  );
}
