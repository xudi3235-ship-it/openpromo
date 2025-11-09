import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export type ImageGeneratorMode = "generate" | "edit";

export interface ImageGeneratorState {
  selectedProductId: string;
  selectedStyleId: string;
  batchCount: number;
  prompt: string;
  referenceImageUrl: string;
  isGeneratorDialogOpen: boolean;
  mode: ImageGeneratorMode;
  editingGenerationId: string | null;

  // Actions
  setSelectedProductId: (productId: string) => void;
  setSelectedStyleId: (styleId: string) => void;
  setBatchCount: (count: number) => void;
  setPrompt: (prompt: string) => void;
  setReferenceImageUrl: (url: string) => void;
  setGeneratorDialogOpen: (open: boolean) => void;
  setMode: (mode: ImageGeneratorMode) => void;
  setEditingGenerationId: (generationId: string | null) => void;
  resetForm: () => void;
}

const initialState = {
  selectedProductId: "",
  selectedStyleId: "",
  batchCount: 1,
  prompt: "",
  referenceImageUrl: "",
  isGeneratorDialogOpen: false,
  mode: "generate" as ImageGeneratorMode,
  editingGenerationId: null as string | null,
};

export const useImageGeneratorStore = create<ImageGeneratorState>()(
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

    setBatchCount: (count) =>
      set((state) => {
        state.batchCount = count;
      }),

    setPrompt: (prompt) =>
      set((state) => {
        state.prompt = prompt;
      }),

    setReferenceImageUrl: (url) =>
      set((state) => {
        state.referenceImageUrl = url;
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
        state.batchCount = initialState.batchCount;
        state.prompt = initialState.prompt;
        state.referenceImageUrl = initialState.referenceImageUrl;
        state.isGeneratorDialogOpen = initialState.isGeneratorDialogOpen;
        state.mode = initialState.mode;
        state.editingGenerationId = initialState.editingGenerationId;
      }),
  })),
);
