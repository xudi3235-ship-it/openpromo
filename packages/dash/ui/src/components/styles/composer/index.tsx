import { toast } from "sonner";
import { useStorageUpload } from "@/hooks/useStorageUpload";
import { useStyleCreateMutation } from "@/queries/styles";
import { useStyleComposerStore } from "@/stores/style-composer-store";
import { ComposerFooter } from "./composer-footer";
import { ComposerHeader } from "./composer-header";
import { ImageUploadSection } from "./image-upload-section";
import { StyleFormFields } from "./style-form-fields";

interface StyleComposerProps {
  onSuccess?: () => void;
}

export function StyleComposer({ onSuccess }: StyleComposerProps) {
  const isOpen = useStyleComposerStore((state) => state.isOpen);
  const name = useStyleComposerStore((state) => state.name);
  const description = useStyleComposerStore((state) => state.description);
  const imageGenPrompt = useStyleComposerStore((state) => state.imageGenPrompt);
  const images = useStyleComposerStore((state) => state.images);
  const isUploading = useStyleComposerStore((state) => state.isUploading);

  const setIsUploading = useStyleComposerStore((state) => state.setIsUploading);
  const closeComposer = useStyleComposerStore((state) => state.closeComposer);
  const resetComposer = useStyleComposerStore((state) => state.resetComposer);

  const { uploadFiles } = useStorageUpload();
  const createStyleMutation = useStyleCreateMutation(() => {
    onSuccess?.();
    closeComposer();
    resetComposer();
  });

  const handleSubmit = async () => {
    if (!name.trim() || !description.trim() || !imageGenPrompt.trim()) {
      return;
    }

    try {
      setIsUploading(true);

      // Upload images first if any
      let imageRefs: string[] = [];
      if (images.length > 0) {
        toast.info(`Uploading ${images.length} image(s)...`);
        const uploadResults = await uploadFiles(images);
        imageRefs = uploadResults.map((result) => result.publicUrl);
        toast.success("Images uploaded successfully");
      }

      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      await createStyleMutation.mutateAsync({
        name: name.trim(),
        slug: `${slug}-${Date.now()}`,
        description: description.trim(),
        imageGenPrompt: imageGenPrompt.trim(),
        imageRefs,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create style";
      toast.error(message);
      setIsUploading(false);
    }
  };

  const canSubmit = Boolean(
    name.trim() && description.trim() && imageGenPrompt.trim(),
  );
  const isProcessing = isUploading || createStyleMutation.isPending;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-background shadow-2xl">
        <ComposerHeader />

        {/* Content - Scrollable */}
        <div className="overflow-y-auto p-6 space-y-6">
          <StyleFormFields />
          <ImageUploadSection />
        </div>

        <ComposerFooter
          onSubmit={handleSubmit}
          isProcessing={isProcessing}
          canSubmit={canSubmit}
        />
      </div>
    </div>
  );
}
