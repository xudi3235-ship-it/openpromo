import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import GeneralError from "@/components/errors/general-error";
import NotFoundError from "@/components/errors/not-found-error";
import { Toaster } from "@/components/ui/sonner";
import { useHashNotification } from "@/hooks/useHashNotification";
import { honoApiCall } from "@/lib/hono-client";

const queryClient = new QueryClient();

export const Route = createRootRoute({
  beforeLoad: async () => {
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
  notFoundComponent: NotFoundError,
  errorComponent: GeneralError,
});

function RootLayout() {
  useHashNotification();

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster richColors />
      <Outlet />
      {import.meta.env.MODE === "development" && (
        <>
          <ReactQueryDevtools buttonPosition="bottom-left" />
          <TanStackRouterDevtools position="bottom-right" />
        </>
      )}
    </QueryClientProvider>
  );
}
