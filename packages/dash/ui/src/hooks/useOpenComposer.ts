import type { SharedAttachmentSpec } from "@shared/content";
import { useNavigate } from "@tanstack/react-router";
import type { ContentCreateData } from "@worker/orpc/routes/content/create-content";
import { useCallback } from "react";
import { useConnectedAccounts } from "@/queries/connected-account";
import { useComposerStore } from "@/stores/composer-store";
import { useWorkspace } from "./useWorkspace";

export interface OpenComposerOptions {
  /** Attachments to pre-populate (images, videos, etc.) */
  attachments?: SharedAttachmentSpec[];
  /** Initial message/caption */
  message?: string;
  /** Full content data (for more complex scenarios) */
  contentCreateData?: ContentCreateData;
  /** Content group ID (for editing existing posts) */
  contentGroupID?: string;
}

/**
 * Hook to open the composer with pre-populated content.
 *
 * @example
 * ```tsx
 * const openComposer = useOpenComposer();
 *
 * // Open with a single image
 * openComposer({
 *   attachments: [{
 *     id: "image-123",
 *     type: "photo",
 *     publicUrl: "https://...",
 *     thumbnailUrl: "https://...",
 *     mimeType: "image/jpeg",
 *   }]
 * });
 *
 * // Open with message
 * openComposer({
 *   message: "Check out this product!",
 *   attachments: [...]
 * });
 * ```
 */
export function useOpenComposer() {
  const navigate = useNavigate();
  const { workspace } = useWorkspace();
  const initializeComposer = useComposerStore(
    (state) => state.initializeComposer,
  );
  const currentAccounts = useComposerStore((state) => state.accounts);
  const { accounts } = useConnectedAccounts();
  const selectedAccounts = useComposerStore((state) => state.selectedAccounts);

  return useCallback(
    (options: OpenComposerOptions = {}) => {
      const { attachments, message, contentCreateData, contentGroupID } =
        options;

      // Build content data from options
      const initContentCreateData: ContentCreateData | undefined =
        (contentCreateData ?? (attachments || message))
          ? {
              base: {
                attachments: attachments ?? [],
                message: message,
              },
              placements: {},
            }
          : undefined;

      // Initialize composer store BEFORE navigation
      // This ensures the data is available when ComposerRoot mounts
      initializeComposer({
        initContentCreateData,
        contentGroupID,
        initialAccounts:
          selectedAccounts.length > 0 ? currentAccounts : accounts,
      });

      // Navigate to composer
      navigate({
        to: "/workspaces/$workspaceSlug/composer",
        params: { workspaceSlug: workspace.slug },
      });
    },
    [
      navigate,
      workspace.slug,
      initializeComposer,
      currentAccounts,
      selectedAccounts,
      accounts,
    ],
  );
}
