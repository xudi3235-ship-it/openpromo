import type {
  AllPlacement,
  FBFeedPlacementSpec,
  IGFeedPlacementSpec,
  SharedAttachmentSpec,
} from "@core/domain/content/schema/placement";
import type { Platform } from "@core/schemas/connected-account.sql";
import { createContext, useContext } from "react";
import { createStore, useStore } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { ConnectedAccount } from "@/lib/hono-client";
import type { ContentCreateData } from "../../../worker/src/routes/api/workspaces/content/index";

// Props for initializing the composer store
export interface ComposerProps {
  initialAccounts?: ConnectedAccount[];
  initialPlacementSelected?: AllPlacement | "ALL";
  initialSelectedPreview?: Platform;
  initialMessage?: string;
}

interface ComposerState {
  placementSelected: AllPlacement | "ALL";
  contentCreateData: ContentCreateData;
  selectedPreview: Platform;
  // Keep track of full account objects for UI display
  accountsMap: Map<string, ConnectedAccount>;
  // Derived properties for backward compatibility
  accounts: ConnectedAccount[];
  selectedAccounts: string[];
}

interface ComposerActions {
  setPlacementSpecs: (specs: {
    base?: {
      attachments?: SharedAttachmentSpec[];
      message?: string;
    };
    facebookFeed?: FBFeedPlacementSpec[];
    instagramFeed?: IGFeedPlacementSpec[];
  }) => void;
  toggleAccount: (accountId: string) => void;
  toggleAllAccounts: () => void;
  setAccounts: (accounts: ConnectedAccount[]) => void;
  addAttachments: (files: File[]) => void;
  /**
   * Upload files via workspace media image API and add as attachments.
   * Performs sequential uploads (can be optimized to parallel later) and
   * updates attachment entries with delivery URL & metadata.
   */
  uploadAttachments: (files: File[], workspaceSlug: string) => Promise<void>;
  removeAttachment: (index: number) => void;
  setSelectedPreview: (preview: Platform) => void;
  // Internal getters (not exposed in the public API)
  _getAccounts: () => ConnectedAccount[];
  _getSelectedAccounts: () => string[];
}

export type ComposerStore = ReturnType<typeof createComposerStore>;

export const createComposerStore = (initProps?: Partial<ComposerProps>) => {
  const DEFAULT_PROPS: ComposerProps = {
    initialAccounts: [],
    initialPlacementSelected: "ALL",
    initialSelectedPreview: "FACEBOOK",
    initialMessage: "",
  };

  const props = { ...DEFAULT_PROPS, ...initProps };

  const facebookFeed = props.initialAccounts
    ?.map((acc) => {
      if (acc.platform !== "FACEBOOK") {
        return null;
      }
      return {
        identity: {
          connectedAccountID: acc.id,
          // fbPageID: acc.metadata?.pageID,
        },
        placement: "FB_FEED",
        postSpec: {},
      } satisfies FBFeedPlacementSpec;
    })
    .filter((s) => s != null) as FBFeedPlacementSpec[];

  const instagramFeed = props.initialAccounts
    ?.map((acc) => {
      if (acc.platform !== "INSTAGRAM") {
        return null;
      }
      return {
        identity: {
          connectedAccountID: acc.id,
          // igAccountID: acc.metadata?.igUserID,
        },
        placement: "IG_FEED",
      } satisfies IGFeedPlacementSpec;
    })
    .filter((s) => s != null) as IGFeedPlacementSpec[];

  return createStore<ComposerState & ComposerActions>()(
    immer((set, get) => ({
      placementSelected: props.initialPlacementSelected || "ALL",
      contentCreateData: {
        base: {
          publishingStatus: "PUBLISH_NOW",
          attachments: [],
          message: props.initialMessage || "",
        },
        placements: {
          facebookFeed,
          instagramFeed,
        },
      },
      selectedPreview: props.initialSelectedPreview || "FACEBOOK",
      accountsMap: new Map(
        props.initialAccounts?.map((account) => [account.id, account]) || [],
      ),

      // Derived properties - these are computed each time they're accessed
      get accounts() {
        return Array.from(this.accountsMap.values());
      },
      get selectedAccounts() {
        const fbAccounts =
          this.contentCreateData.placements.facebookFeed?.map(
            (spec) => spec.identity.connectedAccountID,
          ) || [];
        const igAccounts =
          this.contentCreateData.placements.instagramFeed?.map(
            (spec) => spec.identity.connectedAccountID,
          ) || [];
        return [...fbAccounts, ...igAccounts];
      },

      // Internal getters for use within actions
      _getAccounts: () => Array.from(get().accountsMap.values()),
      _getSelectedAccounts: () => {
        const state = get();
        const fbAccounts =
          state.contentCreateData.placements.facebookFeed?.map(
            (spec) => spec.identity.connectedAccountID,
          ) || [];
        const igAccounts =
          state.contentCreateData.placements.instagramFeed?.map(
            (spec) => spec.identity.connectedAccountID,
          ) || [];
        return [...fbAccounts, ...igAccounts];
      },

      setPlacementSpecs: (specs) =>
        set((state) => {
          if (specs.base) {
            if (specs.base.message !== undefined) {
              state.contentCreateData.base.message = specs.base.message;
            }
          }
          if (specs.facebookFeed) {
            state.contentCreateData.placements.facebookFeed =
              specs.facebookFeed;
          }
          if (specs.instagramFeed) {
            state.contentCreateData.placements.instagramFeed =
              specs.instagramFeed;
          }
        }),
      toggleAccount: (accountId) =>
        set((state) => {
          const account = state.accountsMap.get(accountId);
          if (!account) return;

          const selectedAccounts = get()._getSelectedAccounts();

          if (selectedAccounts.includes(accountId)) {
            // Remove account from placements
            if (account.platform === "FACEBOOK") {
              if (state.contentCreateData.placements.facebookFeed) {
                state.contentCreateData.placements.facebookFeed =
                  state.contentCreateData.placements.facebookFeed.filter(
                    (spec) => spec.identity.connectedAccountID !== accountId,
                  );
              }
            } else if (account.platform === "INSTAGRAM") {
              if (state.contentCreateData.placements.instagramFeed) {
                state.contentCreateData.placements.instagramFeed =
                  state.contentCreateData.placements.instagramFeed.filter(
                    (spec) => spec.identity.connectedAccountID !== accountId,
                  );
              }
            }
          } else {
            // Add account to placements
            if (account.platform === "FACEBOOK") {
              const fbSpec: FBFeedPlacementSpec = {
                identity: {
                  connectedAccountID: account.id,
                },
                placement: "FB_FEED",
                postSpec: {},
              };
              if (!state.contentCreateData.placements.facebookFeed) {
                state.contentCreateData.placements.facebookFeed = [];
              }
              state.contentCreateData.placements.facebookFeed.push(fbSpec);
            } else if (account.platform === "INSTAGRAM") {
              const igSpec: IGFeedPlacementSpec = {
                identity: {
                  connectedAccountID: account.id,
                },
                placement: "IG_FEED",
              };
              if (!state.contentCreateData.placements.instagramFeed) {
                state.contentCreateData.placements.instagramFeed = [];
              }
              state.contentCreateData.placements.instagramFeed.push(igSpec);
            }
          }
        }),
      toggleAllAccounts: () =>
        set((state) => {
          const allAccounts = Array.from(state.accountsMap.values());
          const selectedAccounts = get()._getSelectedAccounts();

          if (selectedAccounts.length === allAccounts.length) {
            // Deselect all accounts - clear all placement specs
            state.contentCreateData.placements.facebookFeed = [];
            state.contentCreateData.placements.instagramFeed = [];
          } else {
            // Select all accounts - create specs for all accounts
            const facebookFeed = allAccounts
              .filter((acc) => acc.platform === "FACEBOOK")
              .map(
                (acc) =>
                  ({
                    identity: {
                      connectedAccountID: acc.id,
                    },
                    placement: "FB_FEED",
                    postSpec: {},
                  }) satisfies FBFeedPlacementSpec,
              );

            const instagramFeed = allAccounts
              .filter((acc) => acc.platform === "INSTAGRAM")
              .map(
                (acc) =>
                  ({
                    identity: {
                      connectedAccountID: acc.id,
                    },
                    placement: "IG_FEED",
                  }) satisfies IGFeedPlacementSpec,
              );

            state.contentCreateData.placements.facebookFeed = facebookFeed;
            state.contentCreateData.placements.instagramFeed = instagramFeed;
          }
        }),
      setAccounts: (accounts: ConnectedAccount[]) =>
        set((state) => {
          // Update the accounts map
          state.accountsMap = new Map(
            accounts.map((account) => [account.id, account]),
          );

          // Sync the placement specs with the new accounts (select all by default)
          const facebookFeed = accounts
            .filter((acc) => acc.platform === "FACEBOOK")
            .map(
              (acc) =>
                ({
                  identity: {
                    connectedAccountID: acc.id,
                  },
                  placement: "FB_FEED",
                  postSpec: {},
                }) satisfies FBFeedPlacementSpec,
            );

          const instagramFeed = accounts
            .filter((acc) => acc.platform === "INSTAGRAM")
            .map(
              (acc) =>
                ({
                  identity: {
                    connectedAccountID: acc.id,
                  },
                  placement: "IG_FEED",
                }) satisfies IGFeedPlacementSpec,
            );

          state.contentCreateData.placements.facebookFeed = facebookFeed;
          state.contentCreateData.placements.instagramFeed = instagramFeed;
        }),
      addAttachments: (files: File[]) =>
        set((state) => {
          const newAttachments = files.map((file, index) => ({
            id: `attachment-${Date.now()}-${index}`,
            type: file.type.startsWith("image/")
              ? ("photo" as const)
              : ("video" as const),
            file,
            mimeType: file.type,
          }));
          state.contentCreateData.base.attachments.push(...newAttachments);
        }),
      uploadAttachments: async (files: File[], workspaceSlug: string) => {
        // lazily import client to avoid circular deps
        const { apiClient } = await import("@/lib/hono-client");
        // 1. optimistic add placeholders with uploading flag
        const placeholderIds: string[] = [];
        set((state) => {
          files.forEach((file, idx) => {
            const id = `attachment-${Date.now()}-${idx}`;
            placeholderIds.push(id);
            state.contentCreateData.base.attachments.push({
              id,
              type: file.type.startsWith("image/") ? "photo" : "video",
              file,
              mimeType: file.type,
              metadata: { uploading: true },
            });
          });
        });
        // 2. sequentially upload (keeps CF rate limits simple); collect updates
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const localId = placeholderIds[i];
          try {
            // a) get direct upload URL
            const res = await apiClient.workspaces[
              ":workspaceSlug"
            ].media.images["upload-url"].$post({
              param: { workspaceSlug },
              json: { requireSignedURLs: false },
            });
            if (!res.ok) throw new Error("Failed to get upload URL");
            const { id: imageId, uploadURL } = (await res.json()) as {
              id: string;
              uploadURL: string;
            };
            // b) upload file to Cloudflare direct upload URL
            const form = new FormData();
            form.append("file", file, file.name);
            const uploadResp = await fetch(uploadURL, {
              method: "POST",
              body: form,
            });
            if (!uploadResp.ok) throw new Error("Upload failed");
            // c) update attachment entry (keep local file preview, just store cloud image id)
            set((state) => {
              const att = state.contentCreateData.base.attachments.find(
                (a) => a.id === localId,
              );
              if (att) {
                att.id = imageId; // replace placeholder id with imageId
                att.metadata = {
                  ...(att.metadata || {}),
                  cfImageId: imageId,
                  uploading: false,
                };
              }
            });
          } catch (err) {
            // mark failed
            set((state) => {
              const att = state.contentCreateData.base.attachments.find(
                (a) => a.id === localId,
              );
              if (att) {
                att.metadata = {
                  ...(att.metadata || {}),
                  uploading: false,
                  error: (err as Error).message,
                };
              }
            });
          }
        }
      },
      removeAttachment: (index: number) =>
        set((state) => {
          state.contentCreateData.base.attachments =
            state.contentCreateData.base.attachments.filter(
              (_, i) => i !== index,
            );
        }),
      setSelectedPreview: (preview: Platform) =>
        set((state) => {
          state.selectedPreview = preview;
        }),
    })),
  );
};

export const ComposerContext = createContext<ComposerStore | null>(null);

export function useComposerStore<T = ComposerState & ComposerActions>(
  selector?: (state: ComposerState & ComposerActions) => T,
): T {
  const store = useContext(ComposerContext);
  if (!store) throw new Error("Missing ComposerProvider in the tree");

  return useStore(store, selector || ((state) => state as T));
}
