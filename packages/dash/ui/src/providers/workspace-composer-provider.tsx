import { useConnectedAccounts } from "@/queries/connected-account";
import { useContentGroupQuery } from "@/queries/content";
import type { ComposerProps } from "@/stores/composer-store";
import { useDialogComposerStore } from "@/stores/dialog-composer-store";
import { ComposerProvider } from "./composer-provider";

interface WorkspaceComposerProviderProps {
  children: React.ReactNode;
}

/**
 * Provides composer state at the workspace level.
 * This allows the composer state to persist when switching between dialog and fullscreen modes.
 */
export function WorkspaceComposerProvider({
  children,
}: WorkspaceComposerProviderProps) {
  const { mode, pendingContentGroupID, initialContentCreateData } =
    useDialogComposerStore();

  const { accounts: accountsData } = useConnectedAccounts();
  const { data: contentGroupData } = useContentGroupQuery(
    pendingContentGroupID,
  );

  // Only create the composer when it's actually open (dialog or fullscreen)
  const isComposerActive = mode === "dialog" || mode === "fullscreen";

  if (!isComposerActive) {
    // No composer active, don't provide context
    return <>{children}</>;
  }

  const composerProps = {
    initContentCreateData:
      contentGroupData?.contentCreateData ?? initialContentCreateData,
    contentGroupID: pendingContentGroupID,
    initialAccounts: accountsData ?? [],
    initialMessage: "",
  } as Partial<ComposerProps>;

  return <ComposerProvider {...composerProps}>{children}</ComposerProvider>;
}
