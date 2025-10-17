import { Button } from "@openpromo/ui/components/button";
import { Calendar } from "@openpromo/ui/components/calendar";
import { Input } from "@openpromo/ui/components/input";
import { Label } from "@openpromo/ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@openpromo/ui/components/popover";
import { Switch } from "@openpromo/ui/components/switch";
import { cn } from "@openpromo/ui/lib/utils";
import { AlertCircle, CalendarIcon, Clock2Icon } from "lucide-react";
import type { ReactNode } from "react";
import { useScheduling } from "./hooks/use-scheduling";

// ============= Root Component =============
interface SchedulingSectionRootProps {
  children: ReactNode;
}

function SchedulingSectionRoot({ children }: SchedulingSectionRootProps) {
  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-background/50 p-4">
      {children}
    </div>
  );
}

// ============= Header =============
function SchedulingSectionHeader() {
  const { isScheduled } = useScheduling();
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-sm font-semibold text-foreground">Scheduling</h3>
      <p className="text-xs text-muted-foreground">
        {isScheduled ? "Scheduled publish enabled" : "Publishing immediately"}
      </p>
    </div>
  );
}

// ============= Toggle =============
function SchedulingSectionToggle() {
  const { isScheduled, handleScheduleToggle } = useScheduling();

  return (
    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-3 py-2">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">
          {isScheduled ? "Scheduled publish" : "Immediate publish"}
        </span>
        <span className="text-xs text-muted-foreground">
          Toggle to pick a date and time.
        </span>
      </div>
      <Switch
        id="schedule"
        checked={isScheduled}
        onCheckedChange={handleScheduleToggle}
        aria-label={isScheduled ? "Disable scheduling" : "Enable scheduling"}
      />
    </div>
  );
}

// ============= Picker =============
function SchedulingSectionPicker() {
  const {
    isScheduled,
    date,
    time,
    validationError,
    isOpen,
    setIsOpen,
    handleDateSelect,
    handleTimeChange,
    getMinTimeForDate,
    getDisplayValue,
  } = useScheduling();

  if (!isScheduled) return null;

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-background p-3">
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="schedule-date"
          className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
        >
          Publish on
        </Label>
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              id="schedule-date"
              variant="outline"
              className={cn(
                "w-full justify-start rounded-lg border-border/60 bg-background text-left text-sm font-medium text-foreground",
                !date && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              {getDisplayValue()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto rounded-xl border border-border/60 bg-card/95 p-4 shadow-lg">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              disabled={(day) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return day < today;
              }}
              className="bg-transparent p-0"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div className="relative w-full sm:w-48">
          <Clock2Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="time"
            type="time"
            value={time}
            min={getMinTimeForDate(date)}
            onChange={(e) => handleTimeChange(e.target.value)}
            className={cn(
              "w-full rounded-lg border-border/60 bg-background pl-10 text-sm [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none",
              validationError && "border-red-500 focus-visible:ring-red-500",
            )}
          />
        </div>
        <span className="text-xs text-muted-foreground">
          Times use your current timezone.
        </span>
      </div>

      {validationError && (
        <div className="flex items-center gap-2 rounded-md border border-red-100/80 bg-red-50/80 px-3 py-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
          <AlertCircle className="h-4 w-4" />
          <p>{validationError}</p>
        </div>
      )}
    </div>
  );
}

// ============= Compound Component Export =============
SchedulingSectionRoot.Header = SchedulingSectionHeader;
SchedulingSectionRoot.Toggle = SchedulingSectionToggle;
SchedulingSectionRoot.Picker = SchedulingSectionPicker;

export const SchedulingSection = SchedulingSectionRoot;
