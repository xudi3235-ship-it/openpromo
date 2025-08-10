import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-provider";
import UnauthorizedError from "@/ui/components/errors/unauthorized-error";

export const Route = createFileRoute("/_authenticated")({
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return <UnauthorizedError login={() => navigate({ to: "/login" })} />;
  }

  return <Outlet />;
}
