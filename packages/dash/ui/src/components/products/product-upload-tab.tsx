import { TabsContent } from "@openpromo/ui/components/tabs";
import { Dropzone } from "@/components/dropzone";
import type { UploadedAttachment } from "@/stores/product-modal-store";
import { ProductFilePreview } from "./product-file-preview";

interface ProductUploadTabProps {
  existingAttachments: Array<{
    id?: string;
    type: "photo" | "video";
    publicUrl?: string;
    presignedUrl?: string;
  }>;
  selectedFiles: File[];
  uploadedAttachments: UploadedAttachment[];
  isEditMode: boolean;
  isUploading: boolean;
  onAddFiles: (files: File[]) => void;
  onRemoveExisting: (index: number) => void;
  onRemoveFile: (index: number) => void;
  onRemoveUploaded: (key: string) => void;
}

export function ProductUploadTab({
  existingAttachments,
  selectedFiles,
  uploadedAttachments: _uploadedAttachments,
  isEditMode,
  isUploading,
  onAddFiles,
  onRemoveExisting,
  onRemoveFile,
  onRemoveUploaded: _onRemoveUploaded,
}: ProductUploadTabProps) {
  return (
    <TabsContent value="upload" className="space-y-3 mt-4">
      <Dropzone
        accept={{ "image/*": [], "video/*": [] }}
        maxFiles={10}
        maxSize={50 * 1024 * 1024}
        onDrop={onAddFiles}
        className="h-32"
        disabled={isUploading}
      >
        <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
          <div className="text-center">
            {isUploading ? (
              <>
                <div className="mb-2 flex justify-center">
                  <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin" />
                </div>
                <p className="text-sm font-medium mb-1">Uploading files...</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium mb-1">
                  Upload product images or videos
                </p>
                <p className="text-xs text-muted-foreground">
                  Drag and drop or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Max 10 files • Up to 50MB each
                </p>
              </>
            )}
          </div>
        </div>
      </Dropzone>

      <ProductFilePreview
        existingAttachments={existingAttachments}
        selectedFiles={selectedFiles}
        isEditMode={isEditMode}
        isUploading={isUploading}
        onRemoveExisting={onRemoveExisting}
        onRemoveFile={onRemoveFile}
      />
    </TabsContent>
  );
}
