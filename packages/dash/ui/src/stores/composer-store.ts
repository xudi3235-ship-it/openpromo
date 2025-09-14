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

export interface ValidationError {
  type:
    | "no_accounts"
    | "no_message"
    | "no_media"
    | "invalid_scheduling"
    | "upload_pending"
    | "upload_failed"
    | "platform_limit_exceeded";
  message: string;
  severity: "error" | "warning";
  field?: string; // field that has the error, for targeting UI
}

export interface ValidationState {
  isValid: boolean;
  errors: ValidationError[];
  canPublish: boolean;
}

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
  validation: ValidationState;
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

// Validation logic
const validateComposerState = (state: ComposerState): ValidationState => {
  const errors: ValidationError[] = [];

  // Check if no accounts are selected
  if (state.selectedAccounts.length === 0) {
    errors.push({
      type: "no_accounts",
      message: "Select at least one social media account to publish to",
      severity: "error",
      field: "accounts",
    });
  }

  // Check if message is empty
  if (!state.contentCreateData.base.message?.trim()) {
    errors.push({
      type: "no_message",
      message: "Add a message to your post",
      severity: "error",
      field: "message",
    });
  }

  // Check if no media is attached
  if (!state.contentCreateData.base.attachments?.length) {
    errors.push({
      type: "no_media",
      message: "Add at least one photo or video to your post",
      severity: "warning",
      field: "media",
    });
  }

  // Check for pending uploads
  const hasPendingUploads = state.contentCreateData.base.attachments?.some(
    (att) =>
      att.metadata &&
      typeof att.metadata === "object" &&
      "uploading" in att.metadata &&
      att.metadata.uploading === true,
  );
  if (hasPendingUploads) {
    errors.push({
      type: "upload_pending",
      message: "Wait for all media uploads to complete",
      severity: "error",
      field: "media",
    });
  }

  // Check for failed uploads
  const hasFailedUploads = state.contentCreateData.base.attachments?.some(
    (att) =>
      att.metadata &&
      typeof att.metadata === "object" &&
      "error" in att.metadata &&
      att.metadata.error,
  );
  if (hasFailedUploads) {
    errors.push({
      type: "upload_failed",
      message: "Some media uploads failed. Remove failed uploads or try again",
      severity: "error",
      field: "media",
    });
  }

  // Check scheduling validation (only for scheduled posts)
  if (state.contentCreateData.base.publishingStatus === "SCHEDULED") {
    const publishAt = state.contentCreateData.base.schedulingSpec?.publishAt;
    if (!publishAt || new Date(publishAt) <= new Date()) {
      errors.push({
        type: "invalid_scheduling",
        message: "Scheduled time must be in the future",
        severity: "error",
        field: "scheduling",
      });
    }
  }

  // Check platform-specific limits (could be expanded)
  const attachmentCount = state.contentCreateData.base.attachments?.length || 0;
  if (attachmentCount > 10) {
    errors.push({
      type: "platform_limit_exceeded",
      message: "Too many attachments. Maximum 10 files allowed",
      severity: "error",
      field: "media",
    });
  }

  // Determine if can publish (no errors, warnings are OK)
  const hasErrors = errors.some((error) => error.severity === "error");

  return {
    isValid: errors.length === 0,
    errors,
    canPublish: !hasErrors,
  };
};

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

  // Helper to update validation state
  const updateValidation = (state: ComposerState) => {
    state.validation = validateComposerState(state);
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

  const initialState: ComposerState = {
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
    validation: { isValid: false, errors: [], canPublish: false }, // Will be computed
  };

  // Compute initial validation
  initialState.validation = validateComposerState(initialState);

  return createStore<ComposerState & ComposerActions>()(
    immer((set, get) => ({
      // state
      ...initialState,
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

          // Update validation after changes
          updateValidation(state);
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

          // Update validation after message change
          updateValidation(state);
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

          // Update validation after adding attachments
          updateValidation(state);
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

          // Update validation after removing attachment
          updateValidation(state);
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

          // Update validation after updating attachment
          updateValidation(state);
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

          // Update validation after clearing attachments
          updateValidation(state);
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

            // Get the public URL for the uploaded image
            const publicUrlResponse = await apiClient.workspaces[
              ":workspaceSlug"
            ].media.images[":imageId"].url.$get({
              param: { workspaceSlug, imageId: id },
              query: { variant: "public" },
            });

            let publicUrl: string | undefined;
            if (publicUrlResponse.ok) {
              const { url } = await publicUrlResponse.json();
              publicUrl = url;
            }

            // Update the attachment with success state
            set((state) => {
              const attachment =
                state.contentCreateData.base.attachments?.[attachmentIndex];
              if (attachment) {
                attachment.id = id;
                attachment.s3Key = id;
                attachment.publicUrl = publicUrl;
                attachment.metadata = { uploading: false };
              }

              // Update validation after upload success
              updateValidation(state);
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

              // Update validation after upload failure
              updateValidation(state);
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

          // Update validation after publishing status change
          updateValidation(state);
        }),
      setSchedulingSpec: (schedulingSpec) =>
        set((state) => {
          state.contentCreateData.base.schedulingSpec = schedulingSpec;

          // Update validation after scheduling spec change
          updateValidation(state);
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
