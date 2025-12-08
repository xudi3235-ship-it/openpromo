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
          "w-full h-full flex items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-800 text-muted-foreground",
        )}
        aria-hidden
      >
        <div className="flex items-center justify-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-background/80 text-muted-foreground/70">
            <Image className="h-5 w-5" />
          </span>
          <span className="sr-only">Preview unavailable</span>
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
  return (
    <div className="px-2 pb-2">
      <div className="relative h-20 rounded-md overflow-hidden">
        <ThumbnailImage
          src={src}
          className="rounded-md object-cover w-full h-full"
        />
      </div>
    </div>
  );
}
