import { useEffect } from "react";
import type { ConnectedAccount } from "@/lib/hono-client";
import { type ComposerProps, useComposerStore } from "@/stores/composer-store";
import { ComposerLeft } from "./composer-left";
import { ComposerRight } from "./composer-right";
import { TwoColumnLayout } from "./two-column-layout";

interface ComposerRootProps {
  accounts: ConnectedAccount[];
  className?: string;
  initComposerProps?: Partial<ComposerProps>;
}

/**
 * Main composer component using the global Zustand store.
 *
 * Initializes the composer state when mounted with the provided accounts and props.
 * Since we only have one composer active at a time, we use a global store for simplicity.
 *
 * The store persists across navigation. To reset it, call `resetComposer()` from the store.
 */
export function ComposerRoot({
  accounts,
  className = "",
  initComposerProps,
}: ComposerRootProps) {
  const initializeComposer = useComposerStore(
    (state) => state.initializeComposer,
  );

  useEffect(() => {
    // Just initialize with the provided props and accounts
    // The store will handle merging with existing state if needed
    initializeComposer({
      initialMessage: "",
      ...initComposerProps,
      initialAccounts: accounts,
    });
  }, [accounts, initComposerProps, initializeComposer]);

  return (
    <TwoColumnLayout
      left={<ComposerLeft />}
      right={<ComposerRight />}
      className={className}
    />
  );
}
