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
import { AlertCircle, CalendarIcon, Clock2Icon } from "lucide-react";
import type { ReactNode } from "react";
import { useScheduling } from "./hooks/use-scheduling";

// ============= Root Component =============
interface SchedulingSectionRootProps {
  children: ReactNode;
}

function SchedulingSectionRoot({ children }: SchedulingSectionRootProps) {
  return <div className="space-y-3">{children}</div>;
}

// ============= Header =============
function SchedulingSectionHeader() {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-medium text-foreground">Scheduling</h3>
    </div>
  );
}

// ============= Toggle =============
function SchedulingSectionToggle() {
  const { isScheduled, handleScheduleToggle } = useScheduling();

  return (
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
  );
}

// ============= Compound Component Export =============
SchedulingSectionRoot.Header = SchedulingSectionHeader;
SchedulingSectionRoot.Toggle = SchedulingSectionToggle;
SchedulingSectionRoot.Picker = SchedulingSectionPicker;

export const SchedulingSection = SchedulingSectionRoot;
