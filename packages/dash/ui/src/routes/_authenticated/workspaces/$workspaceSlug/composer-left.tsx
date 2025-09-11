import { Button } from "@openpromo/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@openpromo/ui/components/card";
import { Switch } from "@openpromo/ui/components/switch";
import { Textarea } from "@openpromo/ui/components/textarea";
import {
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Smile,
} from "lucide-react";
import { Dropzone, DropzoneEmptyState } from "@/components/dropzone";
import { AccountSelection } from "./account-selection";

export function ComposerLeft() {
  return (
    <div className="w-[600px] p-6 space-y-4 overflow-y-auto max-h-screen">
      <AccountSelection />

      {/* Media Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle>Media</CardTitle>
          <p className="text-sm text-muted-foreground">
            Share photos and videos. Instagram posts can't exceed 10 photos.
          </p>
        </CardHeader>
        <CardContent>
          <Dropzone
            accept={{ "image/*": [], "video/*": [] }}
            maxFiles={10}
            maxSize={50 * 1024 * 1024}
            onDrop={(files) => {
              // biome-ignore lint/suspicious/noConsole: later
              console.log("Files dropped:", files);
            }}
            className="h-32"
          >
            <DropzoneEmptyState />
          </Dropzone>
        </CardContent>
      </Card>

      {/* Post Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Post details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Customize Toggle */}
          <div className="flex items-center justify-between">
            <label htmlFor="customize" className="text-sm font-medium">
              Customize post for Facebook and Instagram
            </label>
            <Switch id="customize" />
          </div>

          {/* Text Editor */}
          <div>
            <h4 className="text-sm font-medium mb-2">Text</h4>
            <div className="border rounded-lg">
              <Textarea
                placeholder="Write something..."
                className="border-0 resize-none min-h-[100px]"
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

      {/* Scheduling Options Card */}
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

      {/* Footer Actions Card */}
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
    </div>
  );
}
