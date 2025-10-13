import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export interface ImagePreview {
  id: string;
  url: string;
  file: File;
}

export interface StyleComposerState {
  images: File[];
  imagePreviews: ImagePreview[];
  isDragging: boolean;
  isUploading: boolean;
  addImages: (files: File[]) => void;
  removeImage: (id: string) => void;
  setIsDragging: (isDragging: boolean) => void;
  setIsUploading: (isUploading: boolean) => void;
  resetComposer: () => void;
}

const initialState = {
  images: [] as File[],
  imagePreviews: [] as ImagePreview[],
  isDragging: false,
  isUploading: false,
};

export const useStyleComposerStore = create<StyleComposerState>()(
  immer((set) => ({
    ...initialState,

    addImages: (files) =>
      set((state) => {
        files.forEach((file) => {
          const id =
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random()}`;
          const objectUrl = URL.createObjectURL(file);

          state.images.push(file);
          state.imagePreviews.push({
            id,
            url: objectUrl,
            file,
          });
        });
      }),

    removeImage: (id) =>
      set((state) => {
        const index = state.imagePreviews.findIndex(
          (preview) => preview.id === id,
        );
        if (index === -1) {
          return;
        }

        const [removedPreview] = state.imagePreviews.splice(index, 1);
        if (removedPreview) {
          URL.revokeObjectURL(removedPreview.url);
        }

        state.images.splice(index, 1);
      }),

    setIsDragging: (isDragging) =>
      set((state) => {
        state.isDragging = isDragging;
      }),

    setIsUploading: (isUploading) =>
      set((state) => {
        state.isUploading = isUploading;
      }),

    resetComposer: () =>
      set((state) => {
        state.imagePreviews.forEach((preview) => {
          URL.revokeObjectURL(preview.url);
        });
        state.images = [];
        state.imagePreviews = [];
        state.isDragging = false;
        state.isUploading = false;
      }),
  })),
);
