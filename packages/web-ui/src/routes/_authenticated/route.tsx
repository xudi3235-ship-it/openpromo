import { createFileRoute, Outlet, useLoaderData } from "@tanstack/react-router";
import { login } from "@/lib/auth";
import UnauthorizedError from "@/ui/components/errors/unauthorized-error";

export const Route = createFileRoute("/_authenticated")({
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = useLoaderData({ from: "__root__" });

  if (!user) {
    return <UnauthorizedError login={() => login()} />;
  }

  return <Outlet />;
}
