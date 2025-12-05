import { Button } from "@openpromo/ui/components/button";
import { Input } from "@openpromo/ui/components/input";
import { Label } from "@openpromo/ui/components/label";
import { Plus, X } from "lucide-react";
import { useRef, useState } from "react";
import { Dropzone } from "@/components/dropzone";
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
  const [showUrlInput, setShowUrlInput] = useState(false);

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
      <div className="flex items-start gap-3">
        <Dropzone
          accept={{ "image/*": [], "video/*": [] }}
          maxFiles={3}
          disabled={isUploading}
          variant="compact"
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
          className="border-dashed shrink-0"
        >
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Plus className="h-4 w-4" />
          </div>
        </Dropzone>
        <div className="flex-1 space-y-2">
          <button
            type="button"
            onClick={() => setShowUrlInput((prev) => !prev)}
            className="text-xs font-medium text-foreground hover:underline"
          >
            {showUrlInput ? "Hide URL input" : "Paste URL (optional)"}
          </button>
          {showUrlInput && (
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
          )}
        </div>
      </div>
      {assets.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="relative aspect-square overflow-hidden rounded border bg-gray-100"
            >
              <img
                src={asset.url}
                alt="Asset"
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => onRemove(asset.id)}
                className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
