import { Toaster } from "@openpromo/ui/components/sonner";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { EnvironmentBanner } from "@/components/layout/environment-badge";
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
      <EnvironmentBanner />
      <NavigationProgress />
      <Toaster richColors theme={theme} />
      <Outlet />
      {import.meta.env.MODE === "development" && (
        <TanStackDevtools
          plugins={[
            {
              name: "TanStack Query",
              render: <ReactQueryDevtoolsPanel />,
            },
            {
              name: "TanStack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
            {
              name: "Drizzle Studio",
              render: () => (
                <iframe
                  src="https://local.drizzle.studio"
                  title="Drizzle Studio"
                  style={{
                    flexGrow: 1,
                    width: "100%",
                    height: "100%",
                    border: 0,
                  }}
                />
              ),
            },
          ]}
        />
      )}
    </>
  );
}
