import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { AuthProvider } from "@/lib/auth-provider";
import GeneralError from "@/ui/components/errors/general-error";
import NotFoundError from "@/ui/components/errors/not-found-error";

const queryClient = new QueryClient();
export const Route = createRootRoute({
  component: () => (
    <>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Outlet />
          <TanStackRouterDevtools />
        </AuthProvider>
      </QueryClientProvider>
    </>
  ),
  notFoundComponent: NotFoundError,
  errorComponent: GeneralError,
});
