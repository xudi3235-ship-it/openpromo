import { Button } from "@openpromo/ui/components/button";
import { Card, CardContent } from "@openpromo/ui/components/card";
import { Switch } from "@openpromo/ui/components/switch";

export function ComposerFooter() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Switch />
            <label className="text-sm font-medium">Boost</label>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline">Cancel</Button>
            <Button variant="outline" disabled>
              Finish later
            </Button>
            <Button disabled>Publish</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
