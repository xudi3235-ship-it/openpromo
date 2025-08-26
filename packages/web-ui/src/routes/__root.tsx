import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  createRootRouteWithContext,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import z from "zod";
import { NavigationProgress } from "@/components/navigation-progress";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/context/theme-provider";
import type { AuthContext } from "@/hooks/useAuth";
import { useHashNotification } from "@/hooks/useHashNotification";

interface MyRouterContext {
  auth: AuthContext | undefined;
}

const schema = z.object({
  redirect_to: z.string().optional(),
});

export const Route = createRootRouteWithContext<MyRouterContext>()({
  validateSearch: (search) => schema.parse(search),
  beforeLoad: async ({ search }) => {
    if (search.redirect_to) {
      throw redirect({ to: search.redirect_to });
    }
  },
  component: RootLayout,
});

function RootLayout() {
  useHashNotification();

  return (
    <ThemeProvider>
      <NavigationProgress />
      <Toaster richColors />
      <Outlet />
      {import.meta.env.MODE === "development" && (
        <>
          <ReactQueryDevtools buttonPosition="bottom-right" />
          <TanStackRouterDevtools position="bottom-right" />
        </>
      )}
    </ThemeProvider>
  );
}
