import { Button } from "@openpromo/ui/components/button";
import { Calendar } from "@openpromo/ui/components/calendar";
import { Card, CardContent, CardFooter } from "@openpromo/ui/components/card";
import { Input } from "@openpromo/ui/components/input";
import { Label } from "@openpromo/ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@openpromo/ui/components/popover";
import { Switch } from "@openpromo/ui/components/switch";
import { cn } from "@openpromo/ui/lib/utils";
import { format, isToday } from "date-fns";
import { AlertCircle, CalendarIcon, Clock2Icon } from "lucide-react";
import { useState } from "react";
import { useComposerStore } from "@/stores/composer-store";

export function SchedulingOptions() {
  const { contentCreateData, setSchedulingSpec, setPublishingStatus } =
    useComposerStore();
  const [isOpen, setIsOpen] = useState(false);

  // Check if scheduling is currently enabled
  const isScheduled = contentCreateData.base.publishingStatus === "SCHEDULED";

  // Get default scheduled date (20 minutes from now)
  const getDefaultScheduledDate = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 20);
    return now;
  };

  // Get current scheduled date from store or default
  const currentScheduledDate = contentCreateData.base.schedulingSpec?.publishAt
    ? new Date(contentCreateData.base.schedulingSpec.publishAt)
    : getDefaultScheduledDate();

  const [date, setDate] = useState<Date>(currentScheduledDate);
  const [time, setTime] = useState(format(currentScheduledDate, "HH:mm"));
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleScheduleToggle = (checked: boolean) => {
    if (checked) {
      // Enable scheduling - validate and auto-correct if needed
      const scheduledDateTime = combineDateTime(date, time);
      const validatedDateTime = validateScheduledTime(scheduledDateTime);

      // Update local state if validation changed the time
      if (validatedDateTime !== scheduledDateTime) {
        setDate(validatedDateTime);
        setTime(format(validatedDateTime, "HH:mm"));
      }

      // Check for any remaining validation errors
      const error = checkValidationError(validatedDateTime);
      setValidationError(error);

      setPublishingStatus("SCHEDULED", { publishAt: validatedDateTime });
    } else {
      // Disable scheduling and clear any validation errors
      setValidationError(null);
      setPublishingStatus("PUBLISH_NOW");
      setSchedulingSpec(undefined);
    }
  };

  const combineDateTime = (selectedDate: Date, selectedTime: string): Date => {
    const [hours, minutes] = selectedTime.split(":").map(Number);
    const combined = new Date(selectedDate);
    combined.setHours(hours, minutes, 0, 0);
    return combined;
  };

  const validateScheduledTime = (scheduledDateTime: Date): Date => {
    const now = new Date();
    if (scheduledDateTime <= now) {
      // If scheduled time is in the past, default to 20 minutes from now
      const futureTime = new Date();
      futureTime.setMinutes(futureTime.getMinutes() + 20);
      return futureTime;
    }
    return scheduledDateTime;
  };

  const checkValidationError = (scheduledDateTime: Date): string | null => {
    const now = new Date();
    const diffInMinutes = Math.floor(
      (scheduledDateTime.getTime() - now.getTime()) / (1000 * 60),
    );

    if (scheduledDateTime <= now) {
      return "Scheduled time must be in the future. Please select a later time.";
    }

    if (diffInMinutes < 1) {
      return "Scheduled time must be at least 1 minute from now.";
    }

    return null;
  };

  const getMinTimeForDate = (selectedDate: Date): string => {
    if (isToday(selectedDate)) {
      // For today, minimum time is current time
      const now = new Date();
      return format(now, "HH:mm");
    }
    return "00:00"; // For future dates, any time is allowed
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) return;
    setDate(selectedDate);
    const scheduledDateTime = combineDateTime(selectedDate, time);
    const error = checkValidationError(scheduledDateTime);
    setValidationError(error);
    setSchedulingSpec({ publishAt: scheduledDateTime });
  };

  const handleTimeChange = (newTime: string) => {
    setTime(newTime);
    const scheduledDateTime = combineDateTime(date, newTime);
    const error = checkValidationError(scheduledDateTime);
    setValidationError(error);
    setSchedulingSpec({ publishAt: scheduledDateTime });
  };

  const getDisplayValue = () => {
    if (date) {
      return `${format(date, "MM/dd/yyyy")} ${time}`;
    }
    return "MM/DD/YYYY HH:MM";
  };

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Scheduling</h3>
      </div>

      {/* Schedule Toggle */}
      <div className="flex items-center justify-between">
        <label htmlFor="schedule" className="text-sm text-muted-foreground">
          Set date and time
        </label>
        <Switch
          id="schedule"
          checked={isScheduled}
          onCheckedChange={handleScheduleToggle}
        />
      </div>

      {/* Date/Time Picker */}
      {isScheduled && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !date && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {getDisplayValue()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Card className="w-fit py-4 border-0 shadow-none">
              <CardContent className="px-4">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={handleDateSelect}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today;
                  }}
                  className="bg-transparent p-0"
                />
              </CardContent>
              <CardFooter className="flex flex-col gap-4 border-t px-4 !pt-4">
                <div className="flex w-full flex-col gap-3">
                  <Label htmlFor="time">Time</Label>
                  <div className="relative flex w-full items-center gap-2">
                    <Clock2Icon className="text-muted-foreground pointer-events-none absolute left-2.5 size-4 select-none" />
                    <Input
                      id="time"
                      type="time"
                      value={time}
                      min={getMinTimeForDate(date)}
                      onChange={(e) => handleTimeChange(e.target.value)}
                      className={cn(
                        "appearance-none pl-8 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none",
                        validationError && "border-red-500 focus:ring-red-500",
                      )}
                    />
                  </div>
                  {validationError && (
                    <div className="flex items-start gap-2 text-sm text-red-600">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <p>{validationError}</p>
                    </div>
                  )}
                </div>
              </CardFooter>
            </Card>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
