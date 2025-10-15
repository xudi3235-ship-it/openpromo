import { useEffect } from "react";
import type { ConnectedAccount } from "@/lib/hono-client";
import { type ComposerProps, useComposerStore } from "@/stores/composer-store";
import { ComposerLeft } from "./composer-left";
import { ComposerRight } from "./composer-right";
import { TwoColumnLayout } from "./two-column-layout";

interface ResizableComposerProps {
  accounts: ConnectedAccount[];
  className?: string;
  initComposerProps?: Partial<ComposerProps>;
}

/**
 * Main composer component using the global Zustand store.
 *
 * Initializes the composer state when mounted with the provided accounts and props.
 * Since we only have one composer active at a time, we use a global store for simplicity.
 */
export function ResizableComposer({
  accounts,
  className = "",
  initComposerProps,
}: ResizableComposerProps) {
  const initializeComposer = useComposerStore(
    (state) => state.initializeComposer,
  );

  useEffect(() => {
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
