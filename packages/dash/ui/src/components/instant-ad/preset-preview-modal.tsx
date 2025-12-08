import { X } from "lucide-react";
import { useEffect } from "react";

interface PresetPreviewModalProps {
  preset: {
    id: string;
    name: string;
    thumbnailUrl?: string;
    description?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PresetPreviewModal({
  preset,
  isOpen,
  onClose,
}: PresetPreviewModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !preset) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative max-w-2xl max-h-[90vh] w-full mx-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 z-10 p-2 text-white hover:text-gray-300 transition-colors"
        >
          <X size={24} />
        </button>

        {/* Modal content */}
        <div className="bg-white rounded-lg overflow-hidden shadow-2xl">
          {preset.thumbnailUrl && (
            <div className="relative">
              <img
                src={preset.thumbnailUrl}
                alt={preset.name}
                className="w-full h-auto max-h-[70vh] object-contain"
              />
            </div>
          )}

          {/* Info section */}
          <div className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {preset.name}
            </h3>
            {preset.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {preset.description}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
