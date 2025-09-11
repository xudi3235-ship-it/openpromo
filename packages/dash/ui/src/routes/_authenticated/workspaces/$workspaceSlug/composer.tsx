import { createFileRoute } from "@tanstack/react-router";
import { ComposerLeft } from "./composer-left";
import { ComposerRight } from "./composer-right";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/composer",
)({
  component: ComposerComponent,
});

function ComposerComponent() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex max-w-7xl mx-auto">
        <ComposerLeft />
        <ComposerRight />
      </div>
    </div>
  );
}
