import { format, isToday } from "date-fns";
import { useState } from "react";
import { useComposerStore } from "@/stores/composer-store";

export function useScheduling() {
  const { contentCreateData, setSchedulingSpec, setPublishingStatus } =
    useComposerStore();

  const isScheduled = contentCreateData.base.publishingStatus === "SCHEDULED";

  const getDefaultScheduledDate = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 20);
    return now;
  };

  const currentScheduledDate = contentCreateData.base.schedulingSpec?.publishAt
    ? new Date(contentCreateData.base.schedulingSpec.publishAt)
    : getDefaultScheduledDate();

  const [date, setDate] = useState<Date>(currentScheduledDate);
  const [time, setTime] = useState(format(currentScheduledDate, "HH:mm"));
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Utility functions
  const combineDateTime = (selectedDate: Date, selectedTime: string): Date => {
    const [hours, minutes] = selectedTime.split(":").map(Number);
    const combined = new Date(selectedDate);
    combined.setHours(hours, minutes, 0, 0);
    return combined;
  };

  const validateScheduledTime = (scheduledDateTime: Date): Date => {
    const now = new Date();
    if (scheduledDateTime <= now) {
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
      const now = new Date();
      return format(now, "HH:mm");
    }
    return "00:00";
  };

  const getDisplayValue = () => {
    if (date) {
      return `${format(date, "MM/dd/yyyy")} ${time}`;
    }
    return "MM/DD/YYYY HH:MM";
  };

  // Handlers
  const handleScheduleToggle = (checked: boolean) => {
    if (checked) {
      const scheduledDateTime = combineDateTime(date, time);
      const validatedDateTime = validateScheduledTime(scheduledDateTime);

      if (validatedDateTime !== scheduledDateTime) {
        setDate(validatedDateTime);
        setTime(format(validatedDateTime, "HH:mm"));
      }

      const error = checkValidationError(validatedDateTime);
      setValidationError(error);

      setPublishingStatus("SCHEDULED", { publishAt: validatedDateTime });
    } else {
      setValidationError(null);
      setPublishingStatus("PUBLISH_NOW");
      setSchedulingSpec(undefined);
    }
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

  return {
    // State
    isScheduled,
    date,
    time,
    validationError,
    isOpen,
    setIsOpen,

    // Handlers
    handleScheduleToggle,
    handleDateSelect,
    handleTimeChange,

    // Utils
    getMinTimeForDate,
    getDisplayValue,
  };
}
