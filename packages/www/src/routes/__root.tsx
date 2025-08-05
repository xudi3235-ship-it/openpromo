import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { AuthProvider } from "@/lib/auth-provider";

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
});
