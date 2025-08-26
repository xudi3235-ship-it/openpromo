import { createFileRoute } from "@tanstack/react-router";
import { login } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    login("/workspaces");
  },
});
