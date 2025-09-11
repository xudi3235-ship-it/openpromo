import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@openpromo/ui/components/card";
import { Dropzone, DropzoneEmptyState } from "@/components/dropzone";

export function MediaUpload() {
  return (
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
  );
}
