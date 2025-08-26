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
import { useHonoMutation } from "@/lib/hono-client";

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
      api.workspaces.connected_accounts.facebook.auth.$get({
        query: variables,
      }),
    onError: (error) => {
      toast.error(`Failed to initiate Facebook OAuth: ${error.message}`);
    },
    onSuccess({ data: { url } }) {
      toast.success("Successfully initiated Facebook OAuth");
      // open in a dialog
      window.open(url, "_blank");
    },
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
    </div>
  );
}
