import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export interface ImagePreview {
  id: string;
  url: string;
  file?: File;
  isUrl?: boolean;
}

export interface StyleComposerState {
  images: File[];
  imageUrls: string[];
  imagePreviews: ImagePreview[];
  isDragging: boolean;
  isUploading: boolean;
  addImages: (files: File[]) => void;
  addImageUrls: (urls: string[]) => void;
  removeImage: (id: string) => void;
  setIsDragging: (isDragging: boolean) => void;
  setIsUploading: (isUploading: boolean) => void;
  resetComposer: () => void;
}

const initialState = {
  images: [] as File[],
  imageUrls: [] as string[],
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
            isUrl: false,
          });
        });
      }),

    addImageUrls: (urls) =>
      set((state) => {
        urls.forEach((url) => {
          const id =
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random()}`;

          state.imageUrls.push(url);
          state.imagePreviews.push({
            id,
            url,
            isUrl: true,
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
          if (!removedPreview.isUrl) {
            URL.revokeObjectURL(removedPreview.url);
          }
        }

        // Remove from either images or imageUrls
        if (removedPreview?.isUrl) {
          const urlIndex = state.imageUrls.indexOf(removedPreview.url);
          if (urlIndex !== -1) {
            state.imageUrls.splice(urlIndex, 1);
          }
        } else {
          state.images.splice(index, 1);
        }
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
          if (!preview.isUrl) {
            URL.revokeObjectURL(preview.url);
          }
        });
        state.images = [];
        state.imageUrls = [];
        state.imagePreviews = [];
        state.isDragging = false;
        state.isUploading = false;
      }),
  })),
);
