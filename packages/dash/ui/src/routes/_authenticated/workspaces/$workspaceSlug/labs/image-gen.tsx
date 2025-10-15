import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/labs/image-gen",
)({
  component: ImageGenPage,
});

function ImageGenPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Image Generation</h1>
      <p className="text-muted-foreground">
        Image generation tools coming soon...
      </p>
    </div>
  );
}
