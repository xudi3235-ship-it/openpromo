import { Button } from "@openpromo/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@openpromo/ui/components/card";
import { Switch } from "@openpromo/ui/components/switch";
import { Textarea } from "@openpromo/ui/components/textarea";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowUpDown,
  Image,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Smile,
  Users,
} from "lucide-react";
import { Dropzone, DropzoneEmptyState } from "@/components/dropzone";
import { useWorkspace } from "@/hooks/useWorkspace";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/composer",
)({
  component: ComposerComponent,
});

function ComposerComponent() {
  const { workspace } = useWorkspace();

  return (
    <div className="min-h-screen bg-background">
      <div className="flex max-w-7xl mx-auto">
        {/* Left Panel - Configuration */}
        <div className="w-[600px] p-6 space-y-4 overflow-y-auto max-h-screen">
          {/* Platform Selection Card */}
          <Card>
            <CardHeader>
              <CardTitle>Post to</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold relative z-10">
                    f
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                    IG
                  </div>
                </div>
                <div>
                  <p className="font-medium">Facebook and Instagram</p>
                  <p className="text-sm text-muted-foreground">
                    Cross-platform posting
                  </p>
                </div>
                <ArrowUpDown className="w-4 h-4 ml-auto text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

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

        {/* Right Panel - Preview */}
        <div className="flex-1 p-6 bg-card border-l">
          <div className="max-w-md mx-auto">
            {/* Preview Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <h3 className="font-medium">Facebook Feed preview</h3>
                <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex rounded-lg border">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-r-none"
                  disabled
                >
                  <div className="w-4 h-4 bg-blue-600 rounded"></div>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-l-none border-l"
                  disabled
                >
                  <div className="w-4 h-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded"></div>
                </Button>
              </div>
            </div>

            {/* Post Preview */}
            <Card>
              <CardContent className="p-4">
                {/* Post Header */}
                <div className="flex items-start space-x-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600"></div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold text-sm">
                        {workspace?.name || "Your Page"}
                      </h4>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <span>Just now</span>
                      <span>•</span>
                      <Users className="w-3 h-3" />
                    </div>
                  </div>
                </div>

                {/* Post Content */}
                <div className="mb-4">
                  <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Image className="w-12 h-12 mx-auto mb-2" />
                      <p className="text-sm">Media preview will appear here</p>
                    </div>
                  </div>
                </div>

                {/* Post Actions */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <Button variant="ghost" size="sm" className="flex-1">
                    👍 Like
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1">
                    💬 Comment
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1">
                    📤 Share
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
