import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/billing",
)({
  component: BillingPage,
});

function BillingPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="text-muted-foreground">
          Manage your workspace billing and subscription
        </p>
      </div>

      <div className="border border-border rounded-lg p-6 bg-background">
        <h2 className="text-xl font-semibold mb-2">Billing Overview</h2>
        <p className="text-muted-foreground mb-4">
          Billing management coming soon
        </p>
        <p>Billing features will be implemented here.</p>
      </div>
    </div>
  );
}
