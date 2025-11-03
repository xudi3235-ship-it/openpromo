import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export interface ImageGenComposerState {
  selectedProductId: string;
  selectedStyleId: string;
  batchCount: number;
  prompt: string;
  referenceImageUrl: string;
  showAdvanced: boolean;

  // Actions
  setSelectedProductId: (productId: string) => void;
  setSelectedStyleId: (styleId: string) => void;
  setBatchCount: (count: number) => void;
  setPrompt: (prompt: string) => void;
  setReferenceImageUrl: (url: string) => void;
  setShowAdvanced: (show: boolean) => void;
  resetForm: () => void;
}

const initialState = {
  selectedProductId: "",
  selectedStyleId: "",
  batchCount: 1,
  prompt: "",
  referenceImageUrl: "",
  showAdvanced: false,
};

export const useImageGenComposerStore = create<ImageGenComposerState>()(
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

    setShowAdvanced: (show) =>
      set((state) => {
        state.showAdvanced = show;
      }),

    resetForm: () =>
      set((state) => {
        state.selectedProductId = initialState.selectedProductId;
        state.selectedStyleId = initialState.selectedStyleId;
        state.batchCount = initialState.batchCount;
        state.prompt = initialState.prompt;
        state.referenceImageUrl = initialState.referenceImageUrl;
        state.showAdvanced = initialState.showAdvanced;
      }),
  })),
);
