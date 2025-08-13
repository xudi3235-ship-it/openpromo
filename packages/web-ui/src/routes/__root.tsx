import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { apiClient } from "@/lib/hono-client";
import GeneralError from "@/ui/components/errors/general-error";
import NotFoundError from "@/ui/components/errors/not-found-error";

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
  component: () => (
    <>
      <QueryClientProvider client={queryClient}>
        <Outlet />
        <TanStackRouterDevtools />
      </QueryClientProvider>
    </>
  ),
  notFoundComponent: NotFoundError,
  errorComponent: GeneralError,
});
