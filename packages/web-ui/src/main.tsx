import "@/components/styles/globals.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import GeneralError from "./components/errors/general-error";
import NotFoundError from "./components/errors/not-found-error";
import { useAuth } from "./hooks/useAuth";
import reportWebVitals from "./reportWebVitals";
import { routeTree } from "./routeTree.gen";

const queryClient = new QueryClient();

const router = createRouter({
  routeTree,
  context: { auth: undefined },
  defaultPreload: "intent",
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultErrorComponent: GeneralError,
  defaultNotFoundComponent: NotFoundError,
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const RouteProviderWithContext = () => {
  const auth = useAuth();

  return <RouterProvider router={router} context={{ auth }} />;
};

const rootElement = document.getElementById("root");
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouteProviderWithContext />
      </QueryClientProvider>
    </StrictMode>,
  );
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
