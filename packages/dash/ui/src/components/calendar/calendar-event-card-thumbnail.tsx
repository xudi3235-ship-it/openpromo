import { cn } from "@openpromo/ui/lib/utils";
import { Image } from "lucide-react";

// Thumbnail component with fallback
function ThumbnailImage({
  src,
  alt = "Content thumbnail",
  className = "rounded-lg object-cover",
}: {
  src?: string;
  alt?: string;
  className?: string;
}) {
  if (!src) {
    return (
      <div
        className={cn(
          className,
          "w-full h-full flex items-center justify-center rounded-lg border border-border/60 bg-gradient-to-br from-muted/40 via-muted/20 to-background/60 dark:from-muted/20 dark:via-muted/10 dark:to-background/40 text-muted-foreground",
        )}
      >
        <div className="flex flex-col items-center gap-1.5 text-center">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-background/80 shadow-sm ring-1 ring-border/50 dark:bg-background/40">
            <Image className="h-4 w-4" />
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            Preview unavailable
          </span>
          <span className="text-[10px] text-muted-foreground/80">
            Add media to see it here
          </span>
        </div>
      </div>
    );
  }

  return <img src={src} alt={alt} className={cn(className, "w-full h-full")} />;
}

interface CalendarEventCardThumbnailProps {
  src?: string;
}

export function CalendarEventCardThumbnail({
  src,
}: CalendarEventCardThumbnailProps) {
  if (!src) return null;

  return (
    <div className="px-2 pb-2">
      <div className="relative h-16 rounded-md overflow-hidden">
        <ThumbnailImage
          src={src}
          className="rounded-md object-cover w-full h-full"
        />
      </div>
    </div>
  );
}
