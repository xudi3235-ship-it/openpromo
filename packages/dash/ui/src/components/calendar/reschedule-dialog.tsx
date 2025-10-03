"use client";

import { Button } from "@openpromo/ui/components/button";
import { Calendar } from "@openpromo/ui/components/calendar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@openpromo/ui/components/dialog";
import { Input } from "@openpromo/ui/components/input";
import { Label } from "@openpromo/ui/components/label";
import { cn } from "@openpromo/ui/lib/utils";
import { format, isToday } from "date-fns";
import { Clock2Icon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { RescheduleState } from "@/hooks/calendar/useCalendarDragUpdate";

interface CalendarRescheduleDialogProps {
  state: RescheduleState | null;
  onClose: () => void;
  onConfirm: (publishAt: Date) => void;
  onEditMore: () => void;
}

export function CalendarRescheduleDialog({
  state,
  onClose,
  onConfirm,
  onEditMore,
}: CalendarRescheduleDialogProps) {
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState<string>("09:00");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (state) {
      const initial = new Date(state.proposedPublishAt);
      setDate(initial);
      setTime(format(initial, "HH:mm"));
      setValidationError(null);
    }
  }, [state]);

  const minTime = useMemo(() => {
    if (!date) return "00:00";
    if (isToday(date)) {
      return format(new Date(), "HH:mm");
    }
    return "00:00";
  }, [date]);

  const selectedDateTime = useMemo(() => {
    if (!date) return null;
    const [hours, minutes] = time.split(":").map(Number);
    const next = new Date(date);
    next.setHours(hours ?? 0, minutes ?? 0, 0, 0);
    return next;
  }, [date, time]);

  useEffect(() => {
    if (!selectedDateTime) {
      setValidationError("Please select a date and time.");
      return;
    }

    const now = new Date();
    if (selectedDateTime.getTime() <= now.getTime()) {
      setValidationError("Selected time must be in the future.");
    } else {
      setValidationError(null);
    }
  }, [selectedDateTime]);

  if (!state) return null;

  const handleConfirm = () => {
    if (!selectedDateTime || validationError) return;
    onConfirm(selectedDateTime);
  };

  const handleEditMore = () => {
    onEditMore();
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reschedule content</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Choose a new date and time for this scheduled post. You can edit
            additional details in the composer if needed.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">New publish date</Label>
            <Calendar
              mode="single"
              selected={date ?? undefined}
              onSelect={(nextDate) => {
                if (!nextDate) return;
                setDate(nextDate);
              }}
              disabled={(day) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return day < today;
              }}
              className="w-full"
            />
          </div>

          <div>
            <Label htmlFor="reschedule-time" className="mb-2 block">
              New publish time
            </Label>
            <div className="relative flex items-center">
              <Clock2Icon className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="reschedule-time"
                type="time"
                value={time}
                min={minTime}
                onChange={(event) => setTime(event.target.value)}
                className={cn(
                  "pl-9",
                  validationError &&
                    "border-destructive focus-visible:ring-destructive",
                )}
              />
            </div>
          </div>

          {validationError && (
            <p className="text-sm text-destructive">{validationError}</p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-3">
          <Button type="button" variant="ghost" onClick={handleEditMore}>
            Edit more
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={Boolean(validationError) || !selectedDateTime}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
