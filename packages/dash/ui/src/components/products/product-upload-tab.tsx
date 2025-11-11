import { TabsContent } from "@openpromo/ui/components/tabs";
import { Dropzone } from "@/components/dropzone";
import { ProductFilePreview } from "./product-file-preview";

interface ProductUploadTabProps {
  existingAttachments: Array<{
    id?: string;
    type: "photo" | "video";
    publicUrl?: string;
    presignedUrl?: string;
  }>;
  selectedFiles: File[];
  isEditMode: boolean;
  onAddFiles: (files: File[]) => void;
  onRemoveExisting: (index: number) => void;
  onRemoveFile: (index: number) => void;
}

export function ProductUploadTab({
  existingAttachments,
  selectedFiles,
  isEditMode,
  onAddFiles,
  onRemoveExisting,
  onRemoveFile,
}: ProductUploadTabProps) {
  return (
    <TabsContent value="upload" className="space-y-3 mt-4">
      <Dropzone
        accept={{ "image/*": [], "video/*": [] }}
        maxFiles={10}
        maxSize={50 * 1024 * 1024}
        onDrop={onAddFiles}
        className="h-32"
      >
        <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
          <div className="text-center">
            <p className="text-sm font-medium mb-1">
              Upload product images or videos
            </p>
            <p className="text-xs text-muted-foreground">
              Drag and drop or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Max 10 files • Up to 50MB each
            </p>
          </div>
        </div>
      </Dropzone>

      <ProductFilePreview
        existingAttachments={existingAttachments}
        selectedFiles={selectedFiles}
        isEditMode={isEditMode}
        onRemoveExisting={onRemoveExisting}
        onRemoveFile={onRemoveFile}
      />
    </TabsContent>
  );
}
