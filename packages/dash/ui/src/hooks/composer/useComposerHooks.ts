import { useNavigate } from "@tanstack/react-router";
import type { ContentCreateData } from "@worker/routes/api/workspaces/content";
import { useCallback, useEffect, useMemo } from "react";
import { useConnectedAccounts } from "@/queries/connected-account";
import { useContentGroupQuery } from "@/queries/content";
import { useComposerStore } from "@/stores/composer-store";
import type { ComposerMode } from "@/stores/dialog-composer-store";
import { useDialogComposerStore } from "@/stores/dialog-composer-store";
import { useWorkspace } from "../useWorkspace";

interface ComposerDialogLifecycleOptions {
  mode: ComposerMode;
  pendingContentGroupID?: string;
  initialContentCreateData?: ContentCreateData | null;
}

export function useComposerDialogLifecycle({
  mode,
  pendingContentGroupID,
  initialContentCreateData,
}: ComposerDialogLifecycleOptions) {
  const initializeComposer = useComposerStore(
    (state) => state.initializeComposer,
  );

  const { accounts, isLoading: accountsLoading } = useConnectedAccounts();
  const isOpen = mode !== "closed";
  const shouldFetchGroup = isOpen && !!pendingContentGroupID;

  const {
    data: contentGroupData,
    isLoading: contentGroupLoading,
    error: contentGroupError,
  } = useContentGroupQuery(
    shouldFetchGroup ? pendingContentGroupID : undefined,
  );

  useEffect(() => {
    if (!isOpen) return;
    if (!accounts || accounts.length === 0) return;
    if (pendingContentGroupID && contentGroupLoading) return;

    const contentData =
      contentGroupData?.contentCreateData ?? initialContentCreateData ?? null;

    initializeComposer({
      // @ts-expect-error - Type mismatch between API response (string dates) and store type (Date objects)
      initContentCreateData: contentData || undefined,
      contentGroupID: pendingContentGroupID,
      initialAccounts: accounts,
      initialMessage: "",
    });
  }, [
    accounts,
    contentGroupData?.contentCreateData,
    contentGroupLoading,
    initializeComposer,
    initialContentCreateData,
    isOpen,
    pendingContentGroupID,
  ]);

  const isLoading = useMemo(() => {
    if (!isOpen) return false;
    if (accountsLoading) return true;
    if (pendingContentGroupID) {
      return contentGroupLoading;
    }
    return false;
  }, [accountsLoading, contentGroupLoading, isOpen, pendingContentGroupID]);

  return {
    accounts,
    contentGroupData,
    isLoading,
    contentGroupError,
  };
}

export function useComposerPublishHandlers() {
  const ws = useWorkspace();
  const navigate = useNavigate();
  const { mode, closeComposer } = useDialogComposerStore();

  return useCallback(async () => {
    if (mode !== "closed") {
      closeComposer();
    }
    await navigate({
      to: "/workspaces/$workspaceSlug/content",
      params: { workspaceSlug: ws.workspace.slug },
    });
  }, [navigate, ws.workspace.slug, closeComposer, mode]);
}
