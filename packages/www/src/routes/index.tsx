import { createFileRoute } from "@tanstack/react-router";
import { DropdownMenuDemo } from "~/components/__internal__/dropdown";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">OpenPromo</h1>
        <p className="text-lg text-gray-600">
          Cross-platform content creation & management
        </p>
        {/* FIXME: why the fuck the dropdown is not showing up */}
        <DropdownMenuDemo />
      </div>
    </main>
  );
}
