import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useHashNotification } from "@/hooks/useHashNotification";
import { apiClient } from "@/lib/hono-client";
import GeneralError from "@/ui/components/errors/general-error";
import NotFoundError from "@/ui/components/errors/not-found-error";
import { Toaster } from "@/ui/components/sonner";

const queryClient = new QueryClient();

export const Route = createRootRoute({
  beforeLoad: async () => {
    try {
      const user = await apiClient.users.me.$get().then((res) => res.json());
      return { user };
    } catch (_e) {
      return { user: undefined };
    }
  },
  loader: async ({ context }) => {
    return { user: context.user };
  },
  component: RootLayout,
  notFoundComponent: NotFoundError,
  errorComponent: GeneralError,
});

function RootLayout() {
  useHashNotification();

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster richColors />
      <Outlet />
      <TanStackRouterDevtools />
    </QueryClientProvider>
  );
}
