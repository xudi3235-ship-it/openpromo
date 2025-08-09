import UnauthorizedError from "@openpromo/ui/components/errors/unauthorized-error";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-provider";

export const Route = createFileRoute("/_authenticated")({
  component: RouteComponent,
});

function RouteComponent() {
  const { loaded, loggedIn, login } = useAuth();
  if (!loaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!loggedIn) {
    return <UnauthorizedError login={login} />;
  }

  return <Outlet />;
}
