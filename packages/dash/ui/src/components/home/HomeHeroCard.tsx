import { Button } from "@openpromo/ui/components/button";
import type { InsightNarrativeHighlight } from "@shared/insights";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { MomentumCard } from "@/components/momentum/MomentumCard";

type HomeHeroCardProps = {
  workspaceSlug: string;
  workspaceName?: string;
  highlight?: InsightNarrativeHighlight;
  streak?: number;
  isLoading?: boolean;
  suggestion?: {
    label: string;
    description: string;
    ctaLabel: string;
    href: string;
    progressPercent?: number;
  };
};

export function HomeHeroCard({
  workspaceSlug,
  workspaceName,
  highlight,
  streak,
  isLoading,
  suggestion,
}: HomeHeroCardProps) {
  const fallbackTitle = workspaceName
    ? `Welcome to OpenPromo, ${workspaceName}!`
    : "Welcome to OpenPromo!";
  const fallbackDescription =
    "Let's get you set up for growth. Use the CTAs below to set your cadence and queue the next post.";

  const headline = highlight?.headline?.trim();
  const isGenericNarrative = headline
    ? [
        "fresh insights are ready",
        "insights are almost ready",
        "insights ready",
      ].some((phrase) => headline.toLowerCase().includes(phrase))
    : true;

  const hasNarrative = Boolean(highlight && headline && !isGenericNarrative);

  const title = hasNarrative && headline ? headline : fallbackTitle;
  const description = hasNarrative
    ? (highlight?.body ?? fallbackDescription)
    : fallbackDescription;

  return (
    <MomentumCard className="space-y-6" tone="subtle">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3 max-w-3xl">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {workspaceName ?? "Workspace"}
          </p>
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
              {title}
            </h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {streak ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 px-3 py-1 text-xs font-medium text-emerald-500">
              <span className="tracking-tight">{streak}-week streak</span>
            </div>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="sm"
          asChild
          disabled={isLoading}
          className="self-start md:self-auto"
        >
          <Link
            to="/workspaces/$workspaceSlug/insights"
            params={{ workspaceSlug }}
          >
            Share recap
            <ArrowUpRight className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {suggestion ? (
        <div className="flex flex-col gap-4 border-t border-border/40 pt-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {suggestion.label}
            </p>
            <p className="mt-1 text-sm text-foreground">
              {suggestion.description}
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center md:gap-4">
            {typeof suggestion.progressPercent === "number" ? (
              <div className="flex-1 md:w-48">
                <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
                  <span>Cadence</span>
                  <span>
                    {Math.round(
                      Math.min(Math.max(suggestion.progressPercent, 0), 1) *
                        100,
                    )}
                    %
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width]"
                    style={{
                      width: `${Math.round(
                        Math.min(Math.max(suggestion.progressPercent, 0), 1) *
                          100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ) : null}
            <Button variant="outline" asChild>
              <Link to={suggestion.href}>{suggestion.ctaLabel}</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </MomentumCard>
  );
}
