import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { FlaskConical } from "lucide-react";

function LabsLayout() {
  return (
    <div className="flex flex-col h-full">
      {/* Internal Labs Banner */}
      <div className="bg-muted/50 border-b">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center gap-3">
            <FlaskConical className="w-4 h-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Labs</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">
                Internal Only
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/labs",
)({
  beforeLoad: async ({ context, params }) => {
    const { user } = context;
    const isInternal = user.featureFlags.includes("is_internal");

    if (!isInternal) {
      throw redirect({
        to: "/workspaces/$workspaceSlug",
        params: { workspaceSlug: params.workspaceSlug },
      });
    }
  },
  component: LabsLayout,
});
