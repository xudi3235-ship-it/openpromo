import type { Presets } from "@core/domain/agents/presets";
import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

interface ReferencePreviewModalProps {
  preset: Presets.Reference | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PresetPreviewModal({
  preset,
  isOpen,
  onClose,
}: ReferencePreviewModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !preset) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="relative max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 z-10 p-1.5 text-white/80 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        {/* Modal content */}
        <div className="bg-card rounded-lg overflow-hidden shadow-xl border">
          {preset.url && preset.type === "image" ? (
            <img
              src={preset.url}
              alt={preset.description}
              className="w-full h-auto max-h-[50vh] object-contain bg-muted"
            />
          ) : preset.url && preset.type === "video" ? (
            <video
              src={preset.url}
              className="w-full h-auto max-h-[50vh] object-contain bg-muted"
              muted
              loop
              autoPlay
            />
          ) : null}
          {/* Info section */}
          <div className="p-4">
            {preset.description && (
              <p className="text-sm text-muted-foreground leading-snug">
                {preset.description}
              </p>
            )}
            {preset.keywords.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {preset.keywords.slice(0, 8).map((kw) => (
                  <span
                    key={kw}
                    className="text-xs bg-muted px-1.5 py-0.5 rounded"
                  >
                    {kw}
                  </span>
                ))}
                {preset.keywords.length > 8 && (
                  <span className="text-xs text-muted-foreground">
                    +{preset.keywords.length - 8}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
