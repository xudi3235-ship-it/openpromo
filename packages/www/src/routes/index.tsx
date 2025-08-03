import { createFileRoute } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <main>
      <h1 className="text-3xl text-blue-500 mb-5">Hello from Openpromo</h1>
      <Button className="bg-blue-500 text-white hover:bg-blue-600">
        Click Me
      </Button>
    </main>
  );
}
