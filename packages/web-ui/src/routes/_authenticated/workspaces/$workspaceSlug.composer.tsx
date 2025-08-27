import { createFileRoute } from "@tanstack/react-router";
import { Calendar, Image, PenTool, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useWorkspace } from "@/hooks/useWorkspace";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/composer",
)({
  component: ComposerComponent,
});

function ComposerComponent() {
  const { workspace } = useWorkspace();

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="mb-6 flex items-center justify-between space-y-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Content Composer
          </h1>
          <p className="text-[var(--neutral-600)]">
            Create and manage your social media content for {workspace.name}
          </p>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Text Post Card */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[var(--neutral-800)] rounded-lg flex items-center justify-center">
                <PenTool className="w-4 h-4 text-white" />
              </div>
              Text Post
            </CardTitle>
            <CardDescription>
              Create a text-based post for your social media accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="primary">
              Create Text Post
            </Button>
          </CardContent>
        </Card>

        {/* Image Post Card */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[var(--neutral-800)] rounded-lg flex items-center justify-center">
                <Image className="w-4 h-4 text-white" />
              </div>
              Image Post
            </CardTitle>
            <CardDescription>
              Upload and share images with your audience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="primary">
              Upload Image
            </Button>
          </CardContent>
        </Card>

        {/* Video Post Card */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[var(--neutral-800)] rounded-lg flex items-center justify-center">
                <Video className="w-4 h-4 text-white" />
              </div>
              Video Post
            </CardTitle>
            <CardDescription>
              Share video content across your platforms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="primary">
              Upload Video
            </Button>
          </CardContent>
        </Card>

        {/* Scheduled Post Card */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[var(--neutral-800)] rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              Schedule Post
            </CardTitle>
            <CardDescription>
              Plan and schedule your content for optimal timing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="secondary">
              Schedule Content
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
