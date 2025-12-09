import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { FlaskConical } from "lucide-react";

function LabsLayout() {
  return (
    <div className="flex flex-col h-full">
      {/* Internal Labs Pill */}
      <div className="flex justify-center pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted/60 rounded-full border border-border/50">
          <FlaskConical className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            Labs
          </span>
          <span className="text-xs text-muted-foreground/60">• Internal</span>
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
