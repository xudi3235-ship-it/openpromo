import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

function RouteComponent() {
  useEffect(() => {
    window.location.href = `${import.meta.env.VITE_AUTH_URL}/login`;
  }, []);
}
