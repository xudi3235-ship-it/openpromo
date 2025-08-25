import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout";

export const Route = createFileRoute("/_authenticated")({
  loader: async ({ context }) => {
    const { user } = context;
    if (!user) {
      throw redirect({ to: "/login" });
    }
  },
  component: AuthenticatedLayout,
});
