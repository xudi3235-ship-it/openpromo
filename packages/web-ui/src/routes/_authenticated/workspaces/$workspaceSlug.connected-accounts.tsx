import { createFileRoute } from "@tanstack/react-router";
import { ConnectedAccountsPage } from "@/components/connected-accounts/connected-accounts-page";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/connected-accounts",
)({
  component: ConnectedAccountsPage,
});
