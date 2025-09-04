import { Toaster } from "@openpromo/ui/components/sonner";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { NavigationProgress } from "@/components/navigation-progress";
import { useTheme } from "@/context/theme-provider";
import type { AuthContext } from "@/hooks/useAuth";
import { useHashNotification } from "@/hooks/useHashNotification";

interface MyRouterContext {
  auth: AuthContext | undefined;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RootLayout,
});

function RootLayout() {
  useHashNotification();
  const { theme } = useTheme();

  return (
    <>
      <NavigationProgress />
      <Toaster richColors theme={theme} />
      <Outlet />
      {import.meta.env.MODE === "development" && (
        <>
          <ReactQueryDevtools buttonPosition="bottom-right" />
          <TanStackRouterDevtools position="bottom-right" />
        </>
      )}
    </>
  );
}
