import { cn } from "@openpromo/ui/lib/utils";
import type { AllPlacement } from "@shared/content";
import type { CalendarEvent } from "@/components/calendar";
import { matchEntity } from "@/lib/hono-client";

// Platform dot colors
const PLATFORM_DOT_COLORS: Record<string, string> = {
  FB_FEED: "bg-blue-500",
  IG_FEED: "bg-pink-500",
  TT_FEED: "bg-black dark:bg-white",
};

function getPlatformDotColor(placement: AllPlacement): string {
  return PLATFORM_DOT_COLORS[placement] ?? "bg-gray-400";
}

interface CalendarDayDensityDotsProps {
  events: CalendarEvent[];
  maxDots?: number;
  className?: string;
}

/**
 * Density indicator dots showing how many events are on a day
 * Each dot is colored by platform (blue=FB, pink=IG, black=TT)
 */
export function CalendarDayDensityDots({
  events,
  maxDots = 5,
  className,
}: CalendarDayDensityDotsProps) {
  if (events.length === 0) return null;

  // Collect all platforms from events
  const platforms: AllPlacement[] = [];
  for (const event of events) {
    matchEntity(event, {
      content: (entity) => {
        platforms.push(entity.entity.placement);
      },
      group: (entity) => {
        for (const content of entity.contents) {
          platforms.push(content.placement);
        }
      },
    });
  }

  const visibleDots = platforms.slice(0, maxDots);
  const remainingCount = platforms.length - maxDots;

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {visibleDots.map((placement, index) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: dots are uniform
          key={index}
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            getPlatformDotColor(placement),
          )}
        />
      ))}
      {remainingCount > 0 && (
        <span className="text-[8px] text-muted-foreground font-medium ml-0.5">
          +{remainingCount}
        </span>
      )}
    </div>
  );
}
