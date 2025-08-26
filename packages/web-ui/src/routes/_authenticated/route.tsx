import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context }) => {
    const { auth } = context;
    try {
      const user = await auth?.fetchData();
      if (!user) throw redirect({ to: "/login" });
      return { user };
    } catch (error) {
      console.error(error);
      throw redirect({ to: "/login" });
    }
  },
  component: Outlet,
});
