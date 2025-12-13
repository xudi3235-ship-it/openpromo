"use client";

import { Button } from "@openpromo/ui/components/button";
import {
  InstagramFeedPreview,
  type PreviewData,
} from "@openpromo/ui/components/social-preview";
import { Download, RotateCcw } from "lucide-react";
import { ConnectedAccountsRow } from "@/components/connected-accounts/connected-accounts-row";

interface GenerationResultStepProps {
  generatedImageUrl: string;
  onTryAnother: () => void;
}

export function GenerationResultStep({
  generatedImageUrl,
  onTryAnother,
}: GenerationResultStepProps) {
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = generatedImageUrl;
    link.download = "openpromo-ad.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const previewData: PreviewData = {
    accountName: "your_brand",
    profilePicUrl: null,
    caption: "Check out our latest! Shop now and get 20% off your first order.",
    media: [{ type: "photo", url: generatedImageUrl }],
    metrics: { likes: 1234, comments: 56 },
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">
          Your ad is ready!
        </h2>
        <p className="text-muted-foreground text-sm">
          Connect an account to start posting
        </p>
      </div>

      {/* Content: Preview + Connect */}
      <div className="flex flex-row gap-8 items-center justify-center">
        {/* Social Preview */}
        <div className="shrink-0">
          <InstagramFeedPreview data={previewData} size="compact" />
        </div>

        {/* Connect platforms */}
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground">Connect to publish</p>

          <ConnectedAccountsRow
            accounts={[]}
            showAddButton={true}
            appearance="minimal"
          />

          {/* Secondary actions */}
          <div className="flex items-center gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onTryAnother}>
              <RotateCcw className="mr-1.5 size-3.5" />
              Try another
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="mr-1.5 size-3.5" />
              Download
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
