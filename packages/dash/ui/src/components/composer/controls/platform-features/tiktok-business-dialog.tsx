import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@openpromo/ui/components/dialog";
import { Input } from "@openpromo/ui/components/input";
import { Label } from "@openpromo/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@openpromo/ui/components/select";
import { Switch } from "@openpromo/ui/components/switch";
import { cn } from "@openpromo/ui/lib/utils";
import type {
  TikTokBusinessOptions,
  TikTokPrivacyLevel,
} from "@shared/content";
import { TikTokPrivacyLevels } from "@shared/content";

export type ResolvedTikTokOptions = {
  disableComment: boolean;
  disableDuet: boolean;
  disableStitch: boolean;
  autoAddMusic: boolean;
  privacyLevel: TikTokPrivacyLevel;
  photoCoverIndex: number;
  thumbnailOffset: number;
};

export const DEFAULT_TIKTOK_OPTIONS: ResolvedTikTokOptions = {
  disableComment: false,
  disableDuet: false,
  disableStitch: false,
  autoAddMusic: true,
  privacyLevel: "SELF_ONLY",
  photoCoverIndex: 0,
  thumbnailOffset: 0,
};

export function formatTikTokPrivacyLevel(level: TikTokPrivacyLevel) {
  switch (level) {
    case "PUBLIC_TO_EVERYONE":
      return "Public to everyone";
    case "MUTUAL_FOLLOW_FRIENDS":
      return "Mutual followers";
    case "FOLLOWER_OF_CREATOR":
      return "Followers only";
    case "SELF_ONLY":
      return "Only me";
    default:
      return level;
  }
}

interface TikTokBusinessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: ResolvedTikTokOptions;
  hasPhoto: boolean;
  hasVideo: boolean;
  photoCount: number;
  onUpdate: (updates: Partial<TikTokBusinessOptions>) => void;
}

export function TikTokBusinessDialog({
  open,
  onOpenChange,
  options,
  hasPhoto,
  hasVideo,
  photoCount,
  onUpdate,
}: TikTokBusinessDialogProps) {
  const safePhotoCount = Math.max(photoCount, 0);
  const coverDisplayValue = (options.photoCoverIndex ?? 0) + 1;

  const handleCoverIndexChange = (value: string) => {
    if (!value) {
      onUpdate({ photoCoverIndex: 0 });
      return;
    }
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed <= 0) {
      onUpdate({ photoCoverIndex: 0 });
      return;
    }
    onUpdate({ photoCoverIndex: parsed - 1 });
  };

  const handleThumbnailOffsetChange = (value: string) => {
    if (!value) {
      onUpdate({ thumbnailOffset: 0 });
      return;
    }
    const parsed = Number(value);
    onUpdate({
      thumbnailOffset: Number.isNaN(parsed) ? 0 : Math.max(parsed, 0),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>TikTok Business options</DialogTitle>
          <DialogDescription>
            Configure platform-specific settings for Business API publishing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <FeatureToggle
              title="Disable comments"
              description="Turn off comments on the post"
              checked={options.disableComment}
              onCheckedChange={(checked) =>
                onUpdate({ disableComment: checked })
              }
            />
            <FeatureToggle
              title="Disable duets"
              description="Prevent others from dueting your video"
              checked={options.disableDuet}
              disabled={!hasVideo}
              onCheckedChange={(checked) => onUpdate({ disableDuet: checked })}
            />
            <FeatureToggle
              title="Disable stitch"
              description="Stop others from stitching the video"
              checked={options.disableStitch}
              disabled={!hasVideo}
              onCheckedChange={(checked) =>
                onUpdate({ disableStitch: checked })
              }
            />
            {hasPhoto && (
              <FeatureToggle
                title="Auto-add music"
                description="Let TikTok automatically add soundtrack"
                checked={options.autoAddMusic}
                onCheckedChange={(checked) =>
                  onUpdate({ autoAddMusic: checked })
                }
              />
            )}
          </div>

          {hasPhoto && (
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">
                Cover photo position
              </Label>
              <Input
                type="number"
                min={1}
                value={coverDisplayValue}
                onChange={(e) => handleCoverIndexChange(e.target.value)}
                disabled={safePhotoCount === 0}
              />
              <p className="text-[11px] text-muted-foreground">
                {safePhotoCount > 0
                  ? `Select 1-${safePhotoCount} to choose the default cover`
                  : "Add photos to configure the cover image"}
              </p>
            </div>
          )}

          {hasVideo && (
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">
                Thumbnail offset (milliseconds)
              </Label>
              <Input
                type="number"
                min={0}
                value={options.thumbnailOffset}
                onChange={(e) => handleThumbnailOffsetChange(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Adjust the timestamp used for your custom thumbnail.
              </p>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">
              Privacy level
            </Label>
            <Select
              value={options.privacyLevel}
              onValueChange={(value) =>
                onUpdate({ privacyLevel: value as TikTokPrivacyLevel })
              }
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TikTokPrivacyLevels.map((level) => (
                  <SelectItem key={level} value={level}>
                    {formatTikTokPrivacyLevel(level)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Control who can view the published post.
            </p>
          </div>
        </div>

        <DialogFooter className="justify-end">
          <p className="text-xs text-muted-foreground">
            These preferences apply to all TikTok placements for this post.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FeatureToggle({
  title,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border border-border/60 px-3 py-2",
        disabled && "opacity-60",
      )}
    >
      <div className="mr-3 flex flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}
