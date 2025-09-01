"use client";

import { useCallback, useLayoutEffect, useState } from "react";

interface EventVisibilityOptions {
  referencedCell: HTMLDivElement | null;
  eventHeight: number;
  eventGap: number;
}

interface EventVisibilityResult {
  contentRef: React.RefObject<HTMLDivElement>;
  contentHeight: number | null;
  getVisibleEventCount: (totalEvents: number) => number;
}

/**
 * Hook for calculating event visibility based on container height
 * Uses ResizeObserver for efficient updates
 */
export function useEventVisibility({
  referencedCell,
  eventHeight,
  eventGap,
}: EventVisibilityOptions): EventVisibilityResult {
  const [contentHeight, setContentHeight] = useState<number | null>(null);

  // Use layout effect for synchronous measurement before paint
  useLayoutEffect(() => {
    if (!referencedCell) return;

    // Function to update the content height
    const updateHeight = () => {
      setContentHeight(referencedCell.clientHeight);
    };

    // Initial measurement (synchronous)
    updateHeight();

    // Create observer only once and reuse it

    const observer = new ResizeObserver(() => {
      // Just call updateHeight when resize is detected
      updateHeight();
    });

    // Start observing the content container
    observer.observe(referencedCell);

    // Clean up function
    return () => {
      observer.disconnect();
    };
  }, [referencedCell]);

  // Function to calculate visible events for a cell
  const getVisibleEventCount = useCallback(
    (totalEvents: number): number => {
      if (!contentHeight) return totalEvents;

      // Calculate how many events can fit in the container
      const maxEvents = Math.floor(contentHeight / (eventHeight + eventGap));

      // If all events fit, show them all
      if (totalEvents <= maxEvents) {
        return totalEvents;
      } else {
        // Otherwise, reserve space for "more" button by showing one less
        return maxEvents > 0 ? maxEvents - 1 : 0;
      }
    },
    [contentHeight, eventHeight, eventGap],
  );

  // Use type assertion to satisfy TypeScript
  return {
    contentHeight,
    getVisibleEventCount,
  } as EventVisibilityResult;
}
