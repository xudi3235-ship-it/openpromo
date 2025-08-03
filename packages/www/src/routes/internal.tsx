import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/internal")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <main className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Internal Testing Playground</h1>
        
        <div className="grid gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Component Testing</h2>
            <p className="text-gray-600">Test UI components and interactions here.</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">API Testing</h2>
            <p className="text-gray-600">Test API endpoints and data flows here.</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Feature Playground</h2>
            <p className="text-gray-600">Experimental features and prototypes go here.</p>
          </div>
        </div>
      </div>
    </main>
  );
}