import type { UnifiedContentSelect } from "@core/schemas/content.sql";
import { useEffect } from "react";
import { useConnectedAccounts } from "@/queries/connected-account";
import { useComposerStore } from "@/stores/composer-store";

/**
 * Hook to initialize the composer store with content data for preview rendering.
 * Used when you need to display platform-specific content previews.
 *
 * @param content - The content to preview
 * @param connectedAccountId - The ID of the connected account
 *
 * @example
 * ```tsx
 * function MyPreviewComponent({ content, accountId }) {
 *   useInitializeComposerPreview(content, accountId);
 *   return <FBFeedPreview accountId={accountId} />;
 * }
 * ```
 */
export function useInitializeComposerPreview(
  content: UnifiedContentSelect,
  connectedAccountId: string,
) {
  const initializeComposer = useComposerStore(
    (state) => state.initializeComposer,
  );
  const { accounts } = useConnectedAccounts();

  useEffect(() => {
    if (!accounts || accounts.length === 0) return;

    // Find the connected account for this content
    const account = accounts.find((acc) => acc.id === connectedAccountId);
    if (!account) return;

    initializeComposer({
      initialAccounts: [account],
      initialSelectedPreview: account.platform,
      initContentCreateData: {
        base: {
          message: content.placementSpec.message || "",
          attachments: content.placementSpec.attachments || [],
        },
        placements: {},
      },
    });
  }, [connectedAccountId, accounts, initializeComposer, content]);
}
