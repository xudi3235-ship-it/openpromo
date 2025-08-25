import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRootRoute, Outlet, redirect } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import z from "zod";
import { NavigationProgress } from "@/components/navigation-progress";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/context/theme-provider";
import { useHashNotification } from "@/hooks/useHashNotification";
import { honoApiCall } from "@/lib/hono-client";

const queryClient = new QueryClient();

const schema = z.object({
  redirect_to: z.string().optional(),
});

export const Route = createRootRoute({
  validateSearch: (search) => schema.parse(search),
  beforeLoad: async ({ search }) => {
    if (search.redirect_to) {
      throw redirect({ to: search.redirect_to });
    }
    try {
      const user = await honoApiCall((api) => api.users.me.$get(), {
        disableErrorToast: true,
      });
      return user.success ? { user: user.data } : { user: undefined };
    } catch (_e) {
      return { user: undefined };
    }
  },
  loader: async ({ context }) => {
    return { user: context.user };
  },
  component: RootLayout,
});

function RootLayout() {
  useHashNotification();

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationProgress />
        <Toaster richColors />
        <Outlet />
        {import.meta.env.MODE === "development" && (
          <>
            <ReactQueryDevtools buttonPosition="bottom-right" />
            <TanStackRouterDevtools position="bottom-right" />
          </>
        )}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
