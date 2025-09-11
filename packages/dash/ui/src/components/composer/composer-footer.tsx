import { Button } from "@openpromo/ui/components/button";
import { Card, CardContent } from "@openpromo/ui/components/card";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";

export function ComposerFooter() {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      // Mock publish logic
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // TODO: Show success toast, redirect, etc.
    } catch (error) {
      console.error("Failed to publish:", error);
      // TODO: Show error toast
    } finally {
      setIsPublishing(false);
      setShowConfirmDialog(false);
    }
  };

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-end">
            <div className="flex items-center space-x-2">
              <Button variant="outline">Cancel</Button>
              <Button variant="outline" disabled>
                Finish later
              </Button>
              <Button
                onClick={() => setShowConfirmDialog(true)}
                disabled={isPublishing}
              >
                {isPublishing ? "Publishing..." : "Publish"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        title="Publish Content"
        desc="Are you sure you want to publish this content to your selected social media accounts?"
        confirmText="Publish"
        handleConfirm={handlePublish}
        isLoading={isPublishing}
      />
    </>
  );
}
