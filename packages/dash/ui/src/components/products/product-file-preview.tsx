import { Loader2, X } from "lucide-react";

interface ProductFilePreviewProps {
  existingAttachments: Array<{
    id?: string;
    type: "photo" | "video";
    publicUrl?: string;
    presignedUrl?: string;
  }>;
  selectedFiles: File[];
  isEditMode: boolean;
  isUploading?: boolean;
  onRemoveExisting: (index: number) => void;
  onRemoveFile: (index: number) => void;
}

export function ProductFilePreview({
  existingAttachments,
  selectedFiles,
  isEditMode,
  isUploading = false,
  onRemoveExisting,
  onRemoveFile,
}: ProductFilePreviewProps) {
  const totalFiles = existingAttachments.length + selectedFiles.length;

  if (totalFiles === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {totalFiles} file{totalFiles > 1 ? "s" : ""}{" "}
        {isEditMode && existingAttachments.length > 0
          ? `(${existingAttachments.length} existing${selectedFiles.length > 0 ? `, ${selectedFiles.length} new` : ""})`
          : "selected"}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {existingAttachments.map((attachment, index) => {
          const imageUrl =
            attachment.type === "photo"
              ? attachment.publicUrl || attachment.presignedUrl
              : null;
          return (
            <div
              key={attachment.id || `existing-${index}`}
              className="relative group rounded-lg border overflow-hidden"
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={`Attachment ${index + 1}`}
                  className="w-full aspect-square object-cover"
                />
              ) : (
                <div className="w-full aspect-square bg-muted flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">Video</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => onRemoveExisting(index)}
                className="absolute top-1 right-1 p-1 bg-background/80 hover:bg-destructive hover:text-destructive-foreground rounded-md transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/80 to-transparent p-2">
                <p className="text-xs truncate">Existing</p>
              </div>
            </div>
          );
        })}

        {selectedFiles.map((file, index) => (
          <div
            key={`${file.name}-${file.size}-${index}`}
            className="relative group rounded-lg border overflow-hidden"
          >
            {file.type.startsWith("image/") ? (
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                className="w-full aspect-square object-cover"
              />
            ) : (
              <div className="w-full aspect-square bg-muted flex items-center justify-center">
                <span className="text-xs text-muted-foreground">Video</span>
              </div>
            )}

            {/* Subtle loading indicator overlay */}
            {isUploading && (
              <div className="absolute inset-0 bg-background/40 backdrop-blur-[1px] flex items-center justify-center">
                <div className="bg-background/90 rounded-full p-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => onRemoveFile(index)}
              className="absolute top-1 right-1 p-1 bg-background/80 hover:bg-destructive hover:text-destructive-foreground rounded-md transition-colors"
              disabled={isUploading}
            >
              <X className="h-3 w-3" />
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/80 to-transparent p-2">
              <p className="text-xs truncate">{file.name}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
