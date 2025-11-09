import type { ProductSelectType } from "@core/schemas/product.sql";
import { create } from "zustand";

interface ProductModalState {
  // Modal state
  open: boolean;
  isEditMode: boolean;
  product: ProductSelectType | null;

  // Form state
  activeTab: "upload" | "url";
  selectedFiles: File[];
  existingAttachments: ProductSelectType["attachments"];
  isUploading: boolean;

  // Prefilled attachments for creation
  prefilledAttachments: Array<{
    id: string;
    type: "photo" | "video";
    publicUrl?: string;
    presignedUrl?: string;
  }> | null;

  // Actions
  openModal: (product?: ProductSelectType) => void;
  openCreateModal: (
    prefilledAttachments?: Array<{
      id: string;
      type: "photo" | "video";
      publicUrl?: string;
      presignedUrl?: string;
    }>,
  ) => void;
  closeModal: () => void;
  setActiveTab: (tab: "upload" | "url") => void;
  setSelectedFiles: (files: File[]) => void;
  addFiles: (files: File[]) => void;
  removeFile: (index: number) => void;
  setExistingAttachments: (
    attachments: ProductSelectType["attachments"],
  ) => void;
  removeExistingAttachment: (index: number) => void;
  setIsUploading: (uploading: boolean) => void;
  reset: () => void;
}

const initialState = {
  open: false,
  isEditMode: false,
  product: null,
  activeTab: "upload" as const,
  selectedFiles: [],
  existingAttachments: [],
  isUploading: false,
  prefilledAttachments: null,
};

export const useProductModalStore = create<ProductModalState>((set) => ({
  ...initialState,

  openModal: (product) =>
    set({
      open: true,
      isEditMode: Boolean(product),
      product: product || null,
      existingAttachments: product?.attachments || [],
      activeTab: product?.sourceUrl ? "url" : "upload",
      selectedFiles: [],
      prefilledAttachments: null,
    }),

  openCreateModal: (prefilledAttachments) =>
    set({
      open: true,
      isEditMode: false,
      product: null,
      existingAttachments:
        (prefilledAttachments as ProductSelectType["attachments"]) || [],
      activeTab: "upload",
      selectedFiles: [],
      prefilledAttachments: prefilledAttachments || null,
    }),

  closeModal: () =>
    set({
      open: false,
    }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  setSelectedFiles: (files) => set({ selectedFiles: files }),

  addFiles: (files) =>
    set((state) => ({
      selectedFiles: [...state.selectedFiles, ...files],
    })),

  removeFile: (index) =>
    set((state) => ({
      selectedFiles: state.selectedFiles.filter((_, i) => i !== index),
    })),

  setExistingAttachments: (attachments) =>
    set({ existingAttachments: attachments }),

  removeExistingAttachment: (index) =>
    set((state) => ({
      existingAttachments: state.existingAttachments.filter(
        (_, i) => i !== index,
      ),
    })),

  setIsUploading: (uploading) => set({ isUploading: uploading }),

  reset: () =>
    set({
      ...initialState,
    }),
}));
