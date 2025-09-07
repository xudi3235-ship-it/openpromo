import { createFileRoute } from "@tanstack/react-router";
import { Inbox } from "@/components/inbox";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/inbox",
)({
  component: Inbox,
});
