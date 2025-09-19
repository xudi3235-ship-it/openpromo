import { ComposerLeft } from "@/components/composer/layout/composer-left";
import { ComposerRight } from "@/components/composer/layout/composer-right";
import type { ConnectedAccount } from "@/lib/hono-client";
import { ComposerProvider } from "@/providers/composer-provider";
import { useComposerStore } from "@/stores/composer-store";

// Example of how to use the new ComposerProvider
export function ComposerPage() {
  // Example: Pass initial data to the composer
  const initialAccounts: ConnectedAccount[] = [
    // These would typically come from your API
  ];

  return (
    <ComposerProvider
      initialAccounts={initialAccounts}
      initialPlacementSelected="ALL"
      initialSelectedPreview="FACEBOOK"
      initialMessage="Hello world!"
    >
      <div className="flex h-screen">
        <ComposerLeft />
        <ComposerRight />
      </div>
    </ComposerProvider>
  );
}

// Example of using the hook with selectors for better performance
export function OptimizedComposerComponent() {
  // Only subscribe to specific parts of the state
  const message = useComposerStore(
    (state) => state.contentCreateData.base.message,
  );
  const selectedAccounts = useComposerStore((state) => state.selectedAccounts);
  const setMessage = useComposerStore((state) => state.setPlacementSpecs);

  return (
    <div>
      <p>Current message: {message}</p>
      <p>Selected accounts: {selectedAccounts.length}</p>
      <button onClick={() => setMessage({ base: { message: "Updated!" } })}>
        Update Message
      </button>
    </div>
  );
}
