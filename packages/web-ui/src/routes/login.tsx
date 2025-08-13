import { createFileRoute, redirect } from "@tanstack/react-router";
import { login } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  beforeLoad: async ({ context }) => {
    const { user } = context;
    if (user) {
      return redirect({ to: "/workspaces" });
    }
    login();
  },
});
