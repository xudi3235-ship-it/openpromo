import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <main>
      <h1 className="text-3xl text-blue-500 mb-5">Hello from Openpromo</h1>
    </main>
  );
}
