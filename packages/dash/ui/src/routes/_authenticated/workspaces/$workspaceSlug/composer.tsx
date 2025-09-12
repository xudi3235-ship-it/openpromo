import { createFileRoute } from "@tanstack/react-router";
import { ComposerLeft } from "@/components/composer/composer-left";
import { ComposerRight } from "@/components/composer/composer-right";
import { ComposerProvider } from "@/providers/composer-provider";
import { useConnectedAccounts } from "@/queries/connected-account";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/composer",
)({
  component: ComposerComponent,
});

function ComposerComponent() {
  const { data } = useConnectedAccounts();
  return (
    <div className="min-h-screen bg-background">
      <div className="flex max-w-7xl mx-auto">
        <ComposerProvider
          initialAccounts={data?.accounts ?? []}
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
