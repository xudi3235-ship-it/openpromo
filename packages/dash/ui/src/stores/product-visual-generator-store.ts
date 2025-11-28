import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export type GeneratorMode = "generate" | "edit";
export type GenerationType = "images" | "video";

export interface ProductVisualGeneratorState {
  // Common state
  selectedProductId: string;
  selectedStyleId: string;
  prompt: string;
  generationType: GenerationType;

  // Image-specific state
  batchCount: number;
  referenceImageUrl: string;

  // Video-specific state
  avatarImageUrl: string;

  // Dialog/UI state
  isGeneratorDialogOpen: boolean;
  mode: GeneratorMode;
  editingGenerationId: string | null;

  // Actions
  setSelectedProductId: (productId: string) => void;
  setSelectedStyleId: (styleId: string) => void;
  setPrompt: (prompt: string) => void;
  setGenerationType: (type: GenerationType) => void;
  setBatchCount: (count: number) => void;
  setReferenceImageUrl: (url: string) => void;
  setAvatarImageUrl: (url: string) => void;
  setGeneratorDialogOpen: (open: boolean) => void;
  setMode: (mode: GeneratorMode) => void;
  setEditingGenerationId: (generationId: string | null) => void;
  resetForm: () => void;
}

const initialState = {
  selectedProductId: "",
  selectedStyleId: "",
  prompt: "",
  generationType: "images" as GenerationType,
  batchCount: 1,
  referenceImageUrl: "",
  avatarImageUrl: "",
  isGeneratorDialogOpen: false,
  mode: "generate" as GeneratorMode,
  editingGenerationId: null as string | null,
};

export const useProductVisualGeneratorStore =
  create<ProductVisualGeneratorState>()(
    immer((set) => ({
      ...initialState,

      setSelectedProductId: (productId) =>
        set((state) => {
          state.selectedProductId = productId;
        }),

      setSelectedStyleId: (styleId) =>
        set((state) => {
          state.selectedStyleId = styleId;
        }),

      setPrompt: (prompt) =>
        set((state) => {
          state.prompt = prompt;
        }),

      setGenerationType: (type) =>
        set((state) => {
          state.generationType = type;
        }),

      setBatchCount: (count) =>
        set((state) => {
          state.batchCount = count;
        }),

      setReferenceImageUrl: (url) =>
        set((state) => {
          state.referenceImageUrl = url;
        }),

      setAvatarImageUrl: (url) =>
        set((state) => {
          state.avatarImageUrl = url;
        }),

      setGeneratorDialogOpen: (open) =>
        set((state) => {
          state.isGeneratorDialogOpen = open;
        }),

      setMode: (mode) =>
        set((state) => {
          state.mode = mode;
        }),

      setEditingGenerationId: (generationId) =>
        set((state) => {
          state.editingGenerationId = generationId;
        }),

      resetForm: () =>
        set((state) => {
          state.selectedProductId = initialState.selectedProductId;
          state.selectedStyleId = initialState.selectedStyleId;
          state.prompt = initialState.prompt;
          state.generationType = initialState.generationType;
          state.batchCount = initialState.batchCount;
          state.referenceImageUrl = initialState.referenceImageUrl;
          state.avatarImageUrl = initialState.avatarImageUrl;
          state.isGeneratorDialogOpen = initialState.isGeneratorDialogOpen;
          state.mode = initialState.mode;
          state.editingGenerationId = initialState.editingGenerationId;
        }),
    })),
  );
