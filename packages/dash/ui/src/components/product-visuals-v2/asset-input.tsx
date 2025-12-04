import { Button } from "@openpromo/ui/components/button";
import { Input } from "@openpromo/ui/components/input";
import { Label } from "@openpromo/ui/components/label";
import { X } from "lucide-react";
import { useRef } from "react";
import { Dropzone, DropzoneEmptyState } from "@/components/dropzone";
import type { AssetItem } from "@/features/product-visuals-v2/product-visuals-types";
import { useStorageUpload } from "@/hooks/useStorageUpload";

export function AssetInput({
  label,
  helper,
  assets,
  onAdd,
  onRemove,
}: {
  label: string;
  helper?: string;
  assets: AssetItem[];
  onAdd: (asset: AssetItem) => void;
  onRemove: (id: string) => void;
}) {
  const { uploadFile, isUploading } = useStorageUpload();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleUrlAdd = () => {
    const value = inputRef.current?.value?.trim();
    if (!value) return;
    onAdd({ id: `${value}-${Date.now()}`, url: value });
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <div>
        <Label>{label}</Label>
        {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
      </div>
      <Dropzone
        accept={{ "image/*": [], "video/*": [] }}
        maxFiles={3}
        disabled={isUploading}
        onDrop={async (files) => {
          try {
            const uploaded = await Promise.all(
              files.map((file) => uploadFile(file)),
            );
            uploaded.forEach((file) => {
              onAdd({
                id: file.key,
                url: file.publicUrl,
              });
            });
          } catch {
            // errors handled in hook
          }
        }}
        className="border-dashed"
      >
        <DropzoneEmptyState />
      </Dropzone>
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          placeholder="Paste URL"
          className="font-mono text-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleUrlAdd();
            }
          }}
        />
        <Button variant="outline" size="sm" onClick={handleUrlAdd}>
          Add
        </Button>
      </div>
      {assets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {assets.map((asset) => (
            <span
              key={asset.id}
              className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs"
            >
              <span className="max-w-[200px] truncate">{asset.url}</span>
              <button
                type="button"
                onClick={() => onRemove(asset.id)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
