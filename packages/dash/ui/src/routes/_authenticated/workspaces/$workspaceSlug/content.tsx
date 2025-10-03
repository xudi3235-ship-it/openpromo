import { createFileRoute } from "@tanstack/react-router";
import { ContentPage } from "@/components/content/page";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/content",
)({
  component: function WorkspaceContentRoute() {
    return (
      <div className="h-full p-4">
        <ContentPage />
      </div>
    );
  },
});
