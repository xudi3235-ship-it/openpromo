import { useEffect } from "react";
import type { ConnectedAccount } from "@/lib/hono-client";
import { useComposerStore } from "@/stores/composer-store";
import { ComposerLeft } from "./composer-left";
import { ComposerRight } from "./composer-right";
import { DebuggerFloat } from "./debugger-float";
import { TwoColumnLayout } from "./two-column-layout";

interface ComposerRootProps {
  accounts: ConnectedAccount[];
  className?: string;
}

/**
 * Main composer component using the global Zustand store.
 *
 * Initializes the composer state when mounted with the provided accounts and props.
 * Since we only have one composer active at a time, we use a global store for simplicity.
 *
 * The store persists across navigation. To reset it, call `resetComposer()` from the store.
 */
export function ComposerRoot({ accounts, className = "" }: ComposerRootProps) {
  // Only initialize if composer hasn't been initialized yet
  // This allows useOpenComposer to handle the initialization
  useEffect(() => {
    const currentState = useComposerStore.getState();

    // If composer is already initialized (has attachments or message), don't override
    const hasExistingContent =
      (currentState.contentCreateData.base.attachments?.length ?? 0) > 0 ||
      (currentState.contentCreateData.base.message?.trim().length ?? 0) > 0 ||
      currentState.contentGroupID;

    if (hasExistingContent) {
      // Just update accounts, preserve existing content
      useComposerStore.getState().initializeComposer({
        initialAccounts: accounts,
      });
    } else {
      // Initialize fresh composer with empty state
      useComposerStore.getState().initializeComposer({
        initialAccounts: accounts,
        initContentCreateData: {
          base: {
            message: "",
            attachments: [],
          },
          placements: {},
        },
      });
    }
  }, [accounts]);

  return (
    <>
      <TwoColumnLayout
        left={<ComposerLeft />}
        right={<ComposerRight />}
        className={className}
      />
      <DebuggerFloat />
    </>
  );
}
