import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@openpromo/ui/components/card";
import { Switch } from "@openpromo/ui/components/switch";

export function SchedulingOptions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Scheduling options</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <label htmlFor="schedule" className="text-sm font-medium">
            Set date and time
          </label>
          <Switch id="schedule" />
        </div>
      </CardContent>
    </Card>
  );
}
