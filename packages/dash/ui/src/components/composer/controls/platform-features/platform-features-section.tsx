import { Badge } from "@openpromo/ui/components/badge";
import { Button } from "@openpromo/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@openpromo/ui/components/tooltip";
import { cn } from "@openpromo/ui/lib/utils";
import type {
  FBFeedPlacementSpec,
  SharedAttachmentSpec,
  TikTokFeedPlacementSpec,
} from "@shared/content";
import { Info, MousePointerClick, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { getPlatformMeta } from "@/components/composer/utils/platform-style";
import { useComposerStore } from "@/stores/composer-store";
import { CTA_OPTIONS } from "../../types/platform-features";
import { CTADialog } from "./cta-dialog";
import {
  DEFAULT_TIKTOK_OPTIONS,
  formatTikTokPrivacyLevel,
  type ResolvedTikTokOptions,
  TikTokBusinessDialog,
} from "./tiktok-business-dialog";

export function PlatformFeaturesSection() {
  const composer = useComposerStore();
  const [ctaDialogOpen, setCtaDialogOpen] = useState(false);
  const [tiktokDialogOpen, setTikTokDialogOpen] = useState(false);

  // Get selected platforms
  const selectedPlatforms = useMemo(() => {
    const selectedAccs = composer.selectedAccounts
      .map((id) => composer.accounts.find((acc) => acc.id === id))
      .filter(Boolean);

    if (composer.activeAccount) {
      // In customization mode - only show active account's platform
      const activeAcc = composer.accounts.find(
        (acc) => acc.id === composer.activeAccount,
      );
      return activeAcc ? [activeAcc.platform] : [];
    }

    // Base mode - show all selected platforms (unique)
    const platforms = selectedAccs.map((acc) => acc?.platform).filter(Boolean);
    return [...new Set(platforms)];
  }, [composer.accounts, composer.selectedAccounts, composer.activeAccount]);

  // Get current CTA for Facebook
  const facebookCTA = useMemo(() => {
    if (!selectedPlatforms.includes("FACEBOOK")) return null;

    if (composer.activeAccount) {
      const entry = composer.placementsByAccount[composer.activeAccount];
      if (entry?.platform === "FACEBOOK") {
        const spec = entry.spec as FBFeedPlacementSpec;
        return spec.postSpec.callToAction;
      }
    }

    const fbPlacement = composer.contentCreateData.placements.facebookFeed?.[0];
    return fbPlacement?.postSpec.callToAction;
  }, [
    selectedPlatforms,
    composer.activeAccount,
    composer.placementsByAccount,
    composer.contentCreateData.placements.facebookFeed,
  ]);

  const handleSaveCTA = (type: string, link: string) => {
    composer.setFacebookCTA(type, link);
  };

  const handleRemoveCTA = () => {
    composer.removeFacebookCTA();
  };

  const tiktokFeatureState = useMemo(() => {
    if (!selectedPlatforms.includes("TIKTOK")) return null;

    const resolveOptions = (spec?: TikTokFeedPlacementSpec) => {
      const defaults = getDefaultTikTokOptions();
      const options = spec?.businessOptions;
      return {
        disableComment: options?.disableComment ?? defaults.disableComment,
        disableDuet: options?.disableDuet ?? defaults.disableDuet,
        disableStitch: options?.disableStitch ?? defaults.disableStitch,
        autoAddMusic: options?.autoAddMusic ?? defaults.autoAddMusic,
        privacyLevel: options?.privacyLevel ?? defaults.privacyLevel,
        photoCoverIndex: options?.photoCoverIndex ?? defaults.photoCoverIndex,
        thumbnailOffset: options?.thumbnailOffset ?? defaults.thumbnailOffset,
      };
    };

    const resolveAttachments = (spec?: TikTokFeedPlacementSpec) =>
      spec?.attachments ?? composer.contentCreateData.base.attachments ?? [];

    if (composer.activeAccount) {
      const entry = composer.placementsByAccount[composer.activeAccount];
      if (entry?.platform === "TIKTOK") {
        const spec = entry.spec as TikTokFeedPlacementSpec;
        const attachments = resolveAttachments(spec);
        return {
          options: resolveOptions(spec),
          hasPhoto: attachments.some((att) => att.type === "photo"),
          hasVideo: attachments.some((att) => att.type === "video"),
          photoCount: attachments.filter((att) => att.type === "photo").length,
        };
      }
    }

    const spec = composer.contentCreateData.placements.tiktokFeed?.[0];
    const attachments = resolveAttachments(spec);
    const resolvedOptions = resolveOptions(spec);
    return {
      options: resolvedOptions,
      hasPhoto: attachments.some((att) => att.type === "photo"),
      hasVideo: attachments.some((att) => att.type === "video"),
      photoCount: attachments.filter((att) => att.type === "photo").length,
      summary: buildTikTokSummary(resolvedOptions, attachments),
    };
  }, [
    composer.activeAccount,
    composer.contentCreateData.placements.tiktokFeed,
    composer.contentCreateData.base.attachments,
    composer.placementsByAccount,
    selectedPlatforms,
  ]);

  // Don't show section if no platforms selected
  if (selectedPlatforms.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Section Header */}
        <div className="flex items-center gap-1.5">
          <h4 className="text-xs font-medium text-muted-foreground">
            Platform Features
          </h4>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
              >
                <Info className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <p className="text-xs">
                Configure platform-specific features like call-to-action
                buttons, location tags, and other native features for your
                posts.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Facebook Features */}
        {selectedPlatforms.includes("FACEBOOK") && (
          <FacebookFeaturesRow
            cta={facebookCTA ?? undefined}
            onOpenCTADialog={() => setCtaDialogOpen(true)}
          />
        )}

        {/* Instagram Features - placeholder for future */}
        {selectedPlatforms.includes("INSTAGRAM") && (
          <PlatformRow platform="INSTAGRAM" features={[]} />
        )}

        {/* TikTok Features - placeholder for future */}
        {selectedPlatforms.includes("TIKTOK") && (
          <TikTokFeaturesRow
            summary={tiktokFeatureState?.summary}
            onOpenDialog={() => setTikTokDialogOpen(true)}
          />
        )}
      </div>

      <CTADialog
        open={ctaDialogOpen}
        onOpenChange={setCtaDialogOpen}
        initialType={facebookCTA?.type}
        initialLink={facebookCTA?.value.link}
        onSave={handleSaveCTA}
        onRemove={facebookCTA ? handleRemoveCTA : undefined}
      />

      <TikTokBusinessDialog
        open={tiktokDialogOpen}
        onOpenChange={setTikTokDialogOpen}
        options={tiktokFeatureState?.options ?? DEFAULT_TIKTOK_OPTIONS}
        hasPhoto={tiktokFeatureState?.hasPhoto ?? false}
        hasVideo={tiktokFeatureState?.hasVideo ?? false}
        photoCount={tiktokFeatureState?.photoCount ?? 0}
        onUpdate={composer.updateTikTokBusinessOptions}
      />
    </TooltipProvider>
  );
}

// Facebook-specific row with CTA feature
function FacebookFeaturesRow({
  cta,
  onOpenCTADialog,
}: {
  cta: FBFeedPlacementSpec["postSpec"]["callToAction"];
  onOpenCTADialog: () => void;
}) {
  const meta = getPlatformMeta("FACEBOOK");
  const Icon = meta.icon;

  const ctaOption = cta
    ? CTA_OPTIONS.find((opt) => opt.value === cta.type)
    : null;

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant="secondary"
        className={cn(
          "gap-1.5 px-2 py-0.5 text-xs font-medium",
          meta.accentTextClass,
        )}
      >
        <Icon className="h-3 w-3" />
        Facebook
      </Badge>
      <div className="flex gap-1">
        {/* CTA Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={cta ? "default" : "outline"}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={onOpenCTADialog}
            >
              <MousePointerClick className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              {cta ? `CTA: ${ctaOption?.label}` : "Add Call to Action"}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

// Generic platform row for future platforms
function PlatformRow({
  platform,
  features,
}: {
  platform: "INSTAGRAM" | "TIKTOK";
  features: React.ReactNode[];
}) {
  const meta = getPlatformMeta(platform);
  const Icon = meta.icon;

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant="secondary"
        className={cn(
          "gap-1.5 px-2 py-0.5 text-xs font-medium",
          meta.accentTextClass,
        )}
      >
        <Icon className="h-3 w-3" />
        {platform === "INSTAGRAM" ? "Instagram" : "TikTok"}
      </Badge>
      <div className="flex gap-1">
        {features.length > 0 ? (
          features
        ) : (
          <span className="text-xs text-muted-foreground">
            No features available
          </span>
        )}
      </div>
    </div>
  );
}

function TikTokFeaturesRow({
  summary,
  onOpenDialog,
}: {
  summary?: string;
  onOpenDialog: () => void;
}) {
  const meta = getPlatformMeta("TIKTOK");
  const Icon = meta.icon;

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant="secondary"
        className={cn(
          "gap-1.5 px-2 py-0.5 text-xs font-medium",
          meta.accentTextClass,
        )}
      >
        <Icon className="h-3 w-3" />
        TikTok
      </Badge>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onOpenDialog}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Open TikTok business settings</p>
        </TooltipContent>
      </Tooltip>

      <span className="text-xs text-muted-foreground">
        {summary ?? "No custom TikTok settings"}
      </span>
    </div>
  );
}

function getDefaultTikTokOptions(): ResolvedTikTokOptions {
  return DEFAULT_TIKTOK_OPTIONS;
}

function buildTikTokSummary(
  options: ResolvedTikTokOptions,
  attachments?: SharedAttachmentSpec[] | null,
) {
  const hasVideo = attachments?.some((att) => att.type === "video");
  const hasPhoto = attachments?.some((att) => att.type === "photo");
  const parts: string[] = [
    `Privacy: ${formatTikTokPrivacyLevel(options.privacyLevel)}`,
    options.disableComment ? "Comments off" : "Comments on",
  ];
  if (hasVideo) {
    parts.push(
      options.disableDuet ? "Duet off" : "Duet on",
      options.disableStitch ? "Stitch off" : "Stitch on",
    );
  }
  if (hasPhoto) {
    parts.push(`Cover #${(options.photoCoverIndex ?? 0) + 1}`);
  }
  return parts.join(" • ");
}
