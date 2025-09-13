import { Switch } from "@openpromo/ui/components/switch";
import { DateTimePicker } from "@openpromo/ui/components/time/date-time-picker";
import { useState } from "react";

export function SchedulingOptions() {
  const [isScheduled, setIsScheduled] = useState(false);

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
          onCheckedChange={setIsScheduled}
        />
      </div>

      {/* Date/Time Picker */}
      {isScheduled && <DateTimePicker />}
    </div>
  );
}
