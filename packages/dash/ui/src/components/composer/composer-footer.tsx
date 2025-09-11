import { Button } from "@openpromo/ui/components/button";
import { Card, CardContent } from "@openpromo/ui/components/card";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useHonoMutation } from "@/lib/hono-client";
import { useComposerStore } from "@/stores/composer-store";

function useContentCreateMutation({
  onSettled,
}: {
  onSettled?: () => void;
} = {}) {
  const { workspace } = useWorkspace();
  const { placementSpecs: _ } = useComposerStore();
  return useHonoMutation({
    mutationFn: (api) =>
      api.workspaces[":workspaceSlug"].content.create.$post({
        param: { workspaceSlug: workspace.slug },
        json: {
          base: {
            publishingStatus: "PUBLISH_NOW",
          },
          placements: {
            facebookFeed: {
              identity: {
                connectedAccountID: "TODO",
              },
              placement: "FB_FEED",
              postSpec: {
                message: "TODO",
              },
            },
          },
        },
      }),
    onSettled,
  });
}

export function ComposerFooter() {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const { mutate, isPending } = useContentCreateMutation({
    onSettled: () => {
      setShowConfirmDialog(false);
    },
  });

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
                disabled={isPending}
              >
                {isPending ? "Publishing..." : "Publish"}
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
        handleConfirm={() => mutate({})}
        isLoading={isPending}
      />
    </>
  );
}
