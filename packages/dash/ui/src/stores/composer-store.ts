import type { Platform } from "@core/schemas/connected-account.sql";
import type {
  AllPlacement,
  FBFeedPlacementSpec,
  IGFeedPlacementSpec,
  SharedAttachmentSpec,
} from "@core/schemas/content.sql";
import type { ContentCreateData } from "@worker/routes/api/workspaces/content";
import { createContext, useContext } from "react";
import { toast } from "sonner";
import { createStore, useStore } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { ConnectedAccount } from "@/lib/hono-client";
import { apiClient } from "@/lib/hono-client";

export interface ComposerProps {
  initialAccounts?: ConnectedAccount[];
  initialPlacementSelected?: AllPlacement | "ALL";
  initialSelectedPreview?: Platform;
  initialMessage?: string;
  initContentCreateData?: ContentCreateData;
}

export interface ComposerState {
  placementSelected: AllPlacement | "ALL";
  selectedPreview: Platform;
  accounts: ConnectedAccount[];
  selectedAccounts: string[];
  activeAccount: string | null;
  contentCreateData: ContentCreateData;
}

export interface ComposerActions {
  setSelectedPreview: (platform: Platform) => void;
  setMessage: (message: string) => void;
  setSelectedAccounts: (accountIds: string[]) => void;
  setActiveAccount: (accountId: string | null) => void;
  addAttachments: (files: File[]) => void;
  removeAttachment: (index: number) => void;
  updateAttachment: (
    index: number,
    updates: Partial<SharedAttachmentSpec>,
  ) => void;
  clearAttachments: () => void;
  uploadAttachments: (files: File[], workspaceSlug: string) => Promise<void>;
  reorderAttachments: (fromIndex: number, toIndex: number) => void;
  setPublishingStatus: (
    status: ContentCreateData["base"]["publishingStatus"],
    schedulingSpec?: ContentCreateData["base"]["schedulingSpec"],
  ) => void;
  setSchedulingSpec: (
    schedulingSpec?: ContentCreateData["base"]["schedulingSpec"],
  ) => void;
}

export type ComposerStore = ComposerState & ComposerActions;

export const createComposerStore = (initProps: Partial<ComposerProps>) => {
  const DEFAULT_PROPS: ComposerProps = {
    initialAccounts: [],
    initialPlacementSelected: "ALL",
    initialSelectedPreview: "FACEBOOK",
    initialMessage: "",
  };
  const props = { ...DEFAULT_PROPS, ...initProps } satisfies ComposerProps;

  // Generic helper to update non-customized placements
  const syncToNonCustomizedPlacements = (
    state: ComposerState,
    updateFn: {
      facebook?: (spec: FBFeedPlacementSpec) => void;
      instagram?: (spec: IGFeedPlacementSpec) => void;
    },
  ) => {
    if (updateFn.facebook) {
      state.contentCreateData.placements.facebookFeed?.forEach((spec) => {
        if (!spec.customized && updateFn.facebook) {
          updateFn.facebook(spec);
        }
      });
    }

    if (updateFn.instagram) {
      state.contentCreateData.placements.instagramFeed?.forEach((spec) => {
        if (!spec.customized && updateFn.instagram) {
          updateFn.instagram(spec);
        }
      });
    }
  };

  // If we have existing content data (editing mode), use it; otherwise create new placements
  const initFacebookFeed =
    props.initContentCreateData?.placements?.facebookFeed ||
    (props.initialAccounts
      ?.map((acc) => {
        if (acc.platform === "FACEBOOK") {
          return {
            identity: {
              connectedAccountID: acc.id,
              fbPageID: (acc.metadata as { pageID: string }).pageID,
            },
            placement: "FB_FEED" as const,
            postSpec: {
              message: props.initialMessage || "",
              attachments: [],
            },
            customized: false,
          } as FBFeedPlacementSpec;
        }
        return null;
      })
      .filter(Boolean) as FBFeedPlacementSpec[]) ||
    [];

  const initInstagramFeed =
    props.initContentCreateData?.placements?.instagramFeed ||
    (props.initialAccounts
      ?.map((acc) => {
        if (acc.platform === "INSTAGRAM") {
          return {
            identity: {
              connectedAccountID: acc.id,
              igAccountID: (acc.metadata as { igAccountID: string })
                .igAccountID,
            },
            placement: "IG_FEED" as const,
            caption: props.initialMessage || "",
            attachments: [],
            customized: false,
          } as IGFeedPlacementSpec;
        }
        return null;
      })
      .filter(Boolean) as IGFeedPlacementSpec[]) ||
    [];

  return createStore<ComposerState & ComposerActions>()(
    immer((set, get) => ({
      // state
      placementSelected: props.initialPlacementSelected || "ALL",
      selectedPreview: props.initialSelectedPreview || "FACEBOOK",
      accounts: props.initialAccounts || [],
      selectedAccounts: props.initialAccounts?.map((acc) => acc.id) || [],
      activeAccount: props.initialAccounts?.[0]?.id || null,
      contentCreateData: props.initContentCreateData || {
        base: {
          message: props.initialMessage || "",
          publishingStatus: "PUBLISH_NOW",
          attachments: [],
        },
        placements: {
          facebookFeed: initFacebookFeed,
          instagramFeed: initInstagramFeed,
        },
      },
      // actions
      setSelectedPreview: (platform) =>
        set((state) => {
          state.selectedPreview = platform;
        }),
      setSelectedAccounts: (accountIds) =>
        set((state) => {
          state.selectedAccounts = accountIds;
          // If active account is not in selected accounts, reset it
          if (
            state.activeAccount &&
            !accountIds.includes(state.activeAccount)
          ) {
            state.activeAccount = accountIds[0] || null;
          }

          // Sync placement specs with selected accounts
          // Ensure arrays exist
          if (!state.contentCreateData.placements.facebookFeed) {
            state.contentCreateData.placements.facebookFeed = [];
          }
          if (!state.contentCreateData.placements.instagramFeed) {
            state.contentCreateData.placements.instagramFeed = [];
          }

          // Remove placement specs for deselected accounts
          state.contentCreateData.placements.facebookFeed =
            state.contentCreateData.placements.facebookFeed.filter((spec) =>
              accountIds.includes(spec.identity.connectedAccountID),
            );

          state.contentCreateData.placements.instagramFeed =
            state.contentCreateData.placements.instagramFeed.filter((spec) =>
              accountIds.includes(spec.identity.connectedAccountID),
            );

          // Add placement specs for newly selected accounts
          const currentFacebookIds = new Set(
            state.contentCreateData.placements.facebookFeed.map(
              (spec) => spec.identity.connectedAccountID,
            ),
          );
          const currentInstagramIds = new Set(
            state.contentCreateData.placements.instagramFeed.map(
              (spec) => spec.identity.connectedAccountID,
            ),
          );

          accountIds.forEach((accountId) => {
            const account = state.accounts.find((acc) => acc.id === accountId);
            if (!account) return;

            if (
              account.platform === "FACEBOOK" &&
              !currentFacebookIds.has(accountId)
            ) {
              const newFacebookSpec: FBFeedPlacementSpec = {
                identity: {
                  connectedAccountID: account.id,
                  fbPageID: (account.metadata as { pageID: string }).pageID,
                },
                placement: "FB_FEED" as const,
                postSpec: {
                  message: state.contentCreateData.base.message || "",
                  attachments: [
                    ...(state.contentCreateData.base.attachments || []),
                  ],
                },
                customized: false,
              };
              state.contentCreateData.placements.facebookFeed?.push(
                newFacebookSpec,
              );
            }

            if (
              account.platform === "INSTAGRAM" &&
              !currentInstagramIds.has(accountId)
            ) {
              const newInstagramSpec: IGFeedPlacementSpec = {
                identity: {
                  connectedAccountID: account.id,
                  igAccountID: (account.metadata as { igAccountID: string })
                    .igAccountID,
                },
                placement: "IG_FEED" as const,
                caption: state.contentCreateData.base.message || "",
                attachments: [
                  ...(state.contentCreateData.base.attachments || []),
                ],
                customized: false,
              };
              state.contentCreateData.placements.instagramFeed?.push(
                newInstagramSpec,
              );
            }
          });
        }),
      setActiveAccount: (accountId) =>
        set((state) => {
          state.activeAccount = accountId;
        }),
      setMessage: (message) =>
        set((state) => {
          state.contentCreateData.base.message = message;
          syncToNonCustomizedPlacements(state, {
            facebook: (spec) => {
              spec.postSpec.message = message;
            },
            instagram: (spec) => {
              spec.caption = message;
            },
          });
        }),
      addAttachments: (files) =>
        set((state) => {
          const newAttachments = files.map((file, index) => ({
            id: `temp-${Date.now()}-${Math.random().toString(36).substring(2)}-${index}`,
            type: file.type.startsWith("video/")
              ? ("video" as const)
              : ("photo" as const),
            file,
            mimeType: file.type,
            metadata: { uploading: true },
          }));
          state.contentCreateData.base.attachments?.push(...newAttachments);

          const baseAttachments = [
            ...(state.contentCreateData.base.attachments ?? []),
          ];
          syncToNonCustomizedPlacements(state, {
            facebook: (spec) => {
              spec.attachments = baseAttachments;
            },
            instagram: (spec) => {
              spec.attachments = baseAttachments;
            },
          });
        }),
      removeAttachment: (index) =>
        set((state) => {
          state.contentCreateData.base.attachments?.splice(index, 1);

          const baseAttachments = [
            ...(state.contentCreateData.base.attachments ?? []),
          ];
          syncToNonCustomizedPlacements(state, {
            facebook: (spec) => {
              spec.attachments = baseAttachments;
            },
            instagram: (spec) => {
              spec.attachments = baseAttachments;
            },
          });
        }),
      updateAttachment: (index, updates) =>
        set((state) => {
          const attachment = state.contentCreateData.base.attachments?.[index];
          if (attachment) {
            Object.assign(attachment, updates);
          }

          const baseAttachments = [
            ...(state.contentCreateData.base.attachments ?? []),
          ];
          syncToNonCustomizedPlacements(state, {
            facebook: (spec) => {
              spec.attachments = baseAttachments;
            },
            instagram: (spec) => {
              spec.attachments = baseAttachments;
            },
          });
        }),
      clearAttachments: () =>
        set((state) => {
          state.contentCreateData.base.attachments = [];

          syncToNonCustomizedPlacements(state, {
            facebook: (spec) => {
              spec.attachments = [];
            },
            instagram: (spec) => {
              spec.attachments = [];
            },
          });
        }),
      uploadAttachments: async (files, workspaceSlug) => {
        // First, get the current number of attachments
        const startingIndex =
          get().contentCreateData.base.attachments?.length ?? 0;

        set((state) => {
          const newAttachments = files.map((file, index) => ({
            id: `temp-${Date.now()}-${Math.random().toString(36).substring(2)}-${index}`,
            type: file.type.startsWith("video/")
              ? ("video" as const)
              : ("photo" as const),
            file,
            mimeType: file.type,
            metadata: { uploading: true },
          }));
          state.contentCreateData.base.attachments?.push(...newAttachments);
        });

        // Then upload each file
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const attachmentIndex = startingIndex + i;

          try {
            // Get presigned URL for upload
            const uploadResponse = await apiClient.workspaces[
              ":workspaceSlug"
            ].media.images["upload-url"].$post({
              param: { workspaceSlug },
              json: { requireSignedURLs: false },
            });

            if (!uploadResponse.ok) {
              throw new Error(
                `Failed to get upload URL: ${uploadResponse.status}`,
              );
            }

            const { id, uploadURL } = await uploadResponse.json();

            if (!uploadURL || !id) {
              throw new Error(
                "Invalid response from server: missing uploadURL or id",
              );
            }

            // Upload the file to the presigned URL
            const formData = new FormData();
            formData.append("file", file);

            const uploadFileResponse = await fetch(uploadURL, {
              method: "POST",
              body: formData,
            });

            if (!uploadFileResponse.ok) {
              throw new Error(
                `Failed to upload file: ${uploadFileResponse.status}`,
              );
            }

            // Update the attachment with success state
            set((state) => {
              const attachment =
                state.contentCreateData.base.attachments?.[attachmentIndex];
              if (attachment) {
                attachment.id = id;
                attachment.s3Key = id;
                attachment.metadata = { uploading: false };
              }
            });

            toast.success(`${file.name} uploaded successfully`);
          } catch (error) {
            console.error("Upload error:", error);
            // Update the attachment with error state
            set((state) => {
              const attachment =
                state.contentCreateData.base.attachments?.[attachmentIndex];
              if (attachment) {
                attachment.metadata = {
                  uploading: false,
                  error: "Upload failed",
                };
              }
            });

            toast.error(`Failed to upload ${file.name}`);
          }
        }
      },
      reorderAttachments: (fromIndex, toIndex) =>
        set((state) => {
          const attachments = state.contentCreateData.base.attachments;
          if (!attachments || fromIndex === toIndex) return;

          // Move the item from fromIndex to toIndex
          const [removed] = attachments.splice(fromIndex, 1);
          attachments.splice(toIndex, 0, removed);

          // Sync with placement specs for non-customized placements
          const reorderedAttachments = [...attachments];
          syncToNonCustomizedPlacements(state, {
            facebook: (spec) => {
              spec.attachments = reorderedAttachments;
            },
            instagram: (spec) => {
              spec.attachments = reorderedAttachments;
            },
          });
        }),
      setPublishingStatus: (status, schedulingSpec) =>
        set((state) => {
          state.contentCreateData.base.publishingStatus = status;
          if (schedulingSpec !== undefined) {
            state.contentCreateData.base.schedulingSpec = schedulingSpec;
          } else if (
            status === "SCHEDULED" &&
            !state.contentCreateData.base.schedulingSpec
          ) {
            // Set default scheduling time to 20 minutes from now if none provided
            const defaultDate = new Date();
            defaultDate.setMinutes(defaultDate.getMinutes() + 20);
            state.contentCreateData.base.schedulingSpec = {
              publishAt: defaultDate,
            };
          }
        }),
      setSchedulingSpec: (schedulingSpec) =>
        set((state) => {
          state.contentCreateData.base.schedulingSpec = schedulingSpec;
        }),
    })),
  );
};

export type ComposerStoreType = ReturnType<typeof createComposerStore>;

export const ComposerContext = createContext<ComposerStoreType | null>(null);
export function useComposerStore<T = ComposerState & ComposerActions>(
  selector?: (state: ComposerState & ComposerActions) => T,
): T {
  const store = useContext(ComposerContext);
  if (!store) throw new Error("Missing ComposerProvider in the tree");
  return useStore(store, selector || ((s) => s as T));
}
