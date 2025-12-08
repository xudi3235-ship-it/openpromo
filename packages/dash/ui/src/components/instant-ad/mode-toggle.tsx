import { cn } from "@openpromo/ui/lib/utils";
import type { GenerationMode } from "@/features/instant-ad/instant-ad-types";

export function ModeToggle({
  mode,
  onChange,
}: {
  mode: GenerationMode;
  onChange: (mode: GenerationMode) => void;
}) {
  return (
    <div className="grid h-9 grid-cols-2 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
      <button
        type="button"
        onClick={() => onChange("image")}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          mode === "image"
            ? "bg-background text-foreground shadow"
            : "hover:bg-background/50",
        )}
      >
        Images
      </button>
      <button
        type="button"
        onClick={() => onChange("video")}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          mode === "video"
            ? "bg-background text-foreground shadow"
            : "hover:bg-background/50",
        )}
      >
        Video
      </button>
    </div>
  );
}
