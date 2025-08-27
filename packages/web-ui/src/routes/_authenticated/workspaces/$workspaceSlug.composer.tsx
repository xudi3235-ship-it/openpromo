import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useHonoMutation, useHonoQuery } from "@/lib/hono-client";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/composer",
)({
  component: ComposerComponent,
});

function ComposerComponent() {
  const { workspace } = useWorkspace();

  // Facebook OAuth mutation
  const { mutate: initiateFacebookOAuth, isPending } = useHonoMutation({
    mutationFn: (api, variables: { state?: string }) =>
      api.workspaces[":workspaceSlug"].connected_accounts.facebook.auth.$get({
        query: { state: variables.state },
        param: { workspaceSlug: workspace.slug },
      }),
    onError: (error) => {
      toast.error(`Failed to initiate Facebook OAuth: ${error.message}`);
    },
    onSuccess({ data: { url } }) {
      toast.success("Successfully initiated Facebook OAuth");
      const popup = window.open(
        url,
        "facebook-oauth",
        "width=600,height=700,scrollbars=yes,resizable=yes,status=yes,location=yes,toolbar=no,menubar=no,left=" +
          (screen.width / 2 - 300) +
          ",top=" +
          (screen.height / 2 - 350),
      );

      // Optional: Focus the popup window
      if (popup) {
        popup.focus();
      }
    },
  });
  const { data: connectedAccounts } = useHonoQuery({
    queryKey: [workspace.slug, "connected_accounts"],
    queryFn: (api) =>
      api.workspaces[":workspaceSlug"].connected_accounts.$get({
        param: { workspaceSlug: workspace.slug },
      }),
  });

  const handleFacebookOAuth = () => {
    initiateFacebookOAuth({});
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="mb-6 flex items-center justify-between space-y-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Content Composer
          </h1>
          <p className="text-muted-foreground">
            Create and manage your social media content for {workspace.name}
          </p>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Facebook Integration Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                <span className="text-white text-sm font-bold">f</span>
              </div>
              Facebook
            </CardTitle>
            <CardDescription>
              Connect your Facebook account to start posting content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleFacebookOAuth}
              disabled={isPending}
              className="w-full"
              variant="outline"
            >
              {isPending ? "Connecting..." : "Connect Facebook Account"}
            </Button>
          </CardContent>
        </Card>
      </div>
      connected accounts:
      {connectedAccounts?.accounts.map((account) => (
        <div key={account.id}>
          {account.platform}, {account.accountName}
        </div>
      ))}
    </div>
  );
}
