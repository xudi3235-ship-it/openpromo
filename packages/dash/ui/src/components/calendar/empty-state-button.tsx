"use client";

import { cn } from "@openpromo/ui/lib/utils";
import { isBefore, isToday, startOfDay } from "date-fns";
import { Plus } from "lucide-react";

interface EmptyStateButtonProps {
  day: Date;
  onClick: (day: Date) => void;
  variant?: "large" | "small";
  className?: string;
}

export function EmptyStateButton({
  day,
  onClick,
  variant = "large",
  className,
}: EmptyStateButtonProps) {
  // Helper function to check if we should show the create button
  const shouldShowCreateButton = (date: Date) => {
    const today = startOfDay(new Date());
    const dayStart = startOfDay(date);
    return !isBefore(dayStart, today); // Show for today and future dates
  };

  // Helper function to get the appropriate button text
  const getCreateButtonText = (date: Date) => {
    return isToday(date) ? "Create Post" : "Schedule Post";
  };

  // Don't render button for past dates
  if (!shouldShowCreateButton(day)) {
    return null;
  }

  const handleClick = () => {
    onClick(day);
  };

  if (variant === "small") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "w-full h-8 border border-dashed border-border/30 rounded-lg",
          "flex items-center justify-center text-muted-foreground text-xs",
          "hover:border-border/50 hover:bg-accent/20 transition-all",
          "mt-2 group",
          className,
        )}
      >
        <Plus className="h-3 w-3 opacity-40 group-hover:opacity-60" /> Create
        Post
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "w-full min-h-[150px] border-2 border-dashed border-border/40 rounded-lg",
        "flex items-center justify-center text-muted-foreground",
        "hover:border-border/60 hover:bg-accent/30 transition-all",
        "group",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-sm">
        <Plus className="h-4 w-4 opacity-50 group-hover:opacity-70" />
        <span className="opacity-70 group-hover:opacity-90">
          {getCreateButtonText(day)}
        </span>
      </div>
    </button>
  );
}
