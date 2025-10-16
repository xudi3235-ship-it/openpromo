"use client";

import {
  addDays,
  endOfMonth,
  endOfToday,
  format,
  startOfMonth,
  startOfToday,
} from "date-fns";
import { CalendarIcon } from "lucide-react";
import * as React from "react";
import type { DateRange } from "react-day-picker";

import { cn } from "../../lib/utils";
import { Button } from "../button";
import { Calendar } from "../calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";

interface DateRangePickerProps {
  date?: DateRange;
  onDateChange?: (date: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
}

const DATE_PRESETS: Array<{
  label: string;
  getValue: () => DateRange;
}> = [
  {
    label: "Today",
    getValue: () => ({
      from: startOfToday(),
      to: endOfToday(),
    }),
  },
  {
    label: "Last 7 days",
    getValue: () => ({
      from: addDays(startOfToday(), -7),
      to: endOfToday(),
    }),
  },
  {
    label: "Last 30 days",
    getValue: () => ({
      from: addDays(startOfToday(), -30),
      to: endOfToday(),
    }),
  },
  {
    label: "Last 3 months",
    getValue: () => ({
      from: addDays(startOfToday(), -90),
      to: endOfToday(),
    }),
  },
  {
    label: "This month",
    getValue: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
  {
    label: "Last month",
    getValue: () => {
      const lastMonth = addDays(new Date(), -30);
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
      };
    },
  },
];

export function DateRangePicker({
  date,
  onDateChange,
  placeholder = "Pick a date range",
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleDateSelect = (selectedDate: DateRange | undefined) => {
    onDateChange?.(selectedDate);
    // Close popover if both dates are selected
    if (selectedDate?.from && selectedDate?.to) {
      setIsOpen(false);
    }
  };

  const getDisplayValue = () => {
    if (date?.from) {
      if (date.to) {
        return `${format(date.from, "MM/dd/yyyy")} - ${format(date.to, "MM/dd/yyyy")}`;
      }
      return format(date.from, "MM/dd/yyyy");
    }
    return placeholder;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date?.from && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {getDisplayValue()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 flex" align="start">
        {/* Presets Panel */}
        <div className="flex flex-col gap-2 p-3 border-r">
          {DATE_PRESETS.map((preset) => {
            const presetRange = preset.getValue();
            const isSelected =
              date?.from &&
              date.to &&
              presetRange.from &&
              presetRange.to &&
              format(date.from, "yyyy-MM-dd") ===
                format(presetRange.from, "yyyy-MM-dd") &&
              format(date.to, "yyyy-MM-dd") ===
                format(presetRange.to, "yyyy-MM-dd");

            return (
              <Button
                key={preset.label}
                variant="ghost"
                className={cn(
                  "justify-start text-sm",
                  isSelected && "bg-accent text-accent-foreground",
                )}
                onClick={() => {
                  handleDateSelect(presetRange);
                }}
              >
                {preset.label}
              </Button>
            );
          })}
          <Button
            variant="ghost"
            className={cn(
              "justify-start text-sm",
              !date?.from && "bg-accent text-accent-foreground",
            )}
            onClick={() => {
              handleDateSelect(undefined);
            }}
          >
            Clear
          </Button>
        </div>

        {/* Calendar Panel */}
        <Calendar
          mode="range"
          selected={date}
          onSelect={handleDateSelect}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}
