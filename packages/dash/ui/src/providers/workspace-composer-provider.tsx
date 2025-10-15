import { useEffect } from "react";
import { useConnectedAccounts } from "@/queries/connected-account";
import { useContentGroupQuery } from "@/queries/content";
import { useComposerStore } from "@/stores/composer-store";
import { useDialogComposerStore } from "@/stores/dialog-composer-store";

interface WorkspaceComposerProviderProps {
  children: React.ReactNode;
}

/**
 * Initializes the global composer store at the workspace level.
 *
 * When a composer is opened (dialog or fullscreen mode), this component
 * automatically initializes the global store with the appropriate data.
 */
export function WorkspaceComposerProvider({
  children,
}: WorkspaceComposerProviderProps) {
  const { mode, pendingContentGroupID, initialContentCreateData } =
    useDialogComposerStore();
  const initializeComposer = useComposerStore(
    (state) => state.initializeComposer,
  );

  const { accounts: accountsData } = useConnectedAccounts();
  const { data: contentGroupData } = useContentGroupQuery(
    pendingContentGroupID,
  );

  // Initialize composer when it becomes active
  const isComposerActive = mode === "dialog" || mode === "fullscreen";

  useEffect(() => {
    if (isComposerActive && accountsData) {
      const contentData =
        contentGroupData?.contentCreateData ?? initialContentCreateData;

      initializeComposer({
        // @ts-expect-error - Type mismatch between API response (string dates) and store type (Date objects)
        initContentCreateData: contentData || undefined,
        contentGroupID: pendingContentGroupID,
        initialAccounts: accountsData,
        initialMessage: "",
      });
    }
  }, [
    isComposerActive,
    accountsData,
    contentGroupData?.contentCreateData,
    initialContentCreateData,
    pendingContentGroupID,
    initializeComposer,
  ]);

  return <>{children}</>;
}
