import { Button } from "@openpromo/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@openpromo/ui/components/card";
import { Textarea } from "@openpromo/ui/components/textarea";
import {
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Smile,
} from "lucide-react";
import { useComposerStore } from "@/stores/composer-store";

export function PostDetails() {
  const { contentCreateData, setMessage } = useComposerStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Post details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Text Editor */}
        <div>
          <h4 className="text-sm font-medium mb-2">Text</h4>
          <div className="border rounded-lg">
            <Textarea
              placeholder="Write something..."
              className="border-0 resize-none min-h-[100px]"
              value={contentCreateData.base.message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div className="border-t p-2 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm">
                  #
                </Button>
                <Button variant="ghost" size="sm">
                  <Smile className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm">
            <Smile className="w-4 h-4 mr-2" />
            Feeling/activity
          </Button>
          <Button variant="outline" size="sm">
            <MapPin className="w-4 h-4 mr-2" />
            Location
          </Button>
          <Button variant="outline" size="sm">
            <MessageSquare className="w-4 h-4 mr-2" />
            Get messages
          </Button>
          <Button variant="outline" size="sm">
            <Phone className="w-4 h-4 mr-2" />
            Get calls
          </Button>
          <Button variant="outline" size="sm">
            <MoreHorizontal className="w-4 h-4 mr-2" />
            More features
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
