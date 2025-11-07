import { Button } from "@openpromo/ui/components/button";
import type { InsightNarrativeHighlight } from "@shared/insights";
import { Link } from "@tanstack/react-router";
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
  const title = highlight?.headline ?? "Insights are almost ready";
  const description =
    highlight?.body ??
    "Connect your channels and publish your first post to unlock personalized guidance.";

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
        <div className="flex flex-col gap-2 w-full md:w-auto md:flex-row">
          <Button asChild disabled={isLoading}>
            <Link
              to="/workspaces/$workspaceSlug/composer"
              params={{ workspaceSlug }}
            >
              Create post
            </Link>
          </Button>
          <Button variant="outline" asChild disabled={isLoading}>
            <Link
              to="/workspaces/$workspaceSlug/calendar"
              params={{ workspaceSlug }}
              search={{
                view: "week",
                date: undefined,
                platform: undefined,
                publishingStatus: undefined,
              }}
            >
              Plan calendar
            </Link>
          </Button>
          <Button variant="ghost" asChild disabled={isLoading}>
            <Link
              to="/workspaces/$workspaceSlug/insights"
              params={{ workspaceSlug }}
            >
              View insights
            </Link>
          </Button>
        </div>
      </div>

      {suggestion ? (
        <div className="flex flex-col gap-3 border-t border-border/40 pt-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {suggestion.label}
            </p>
            <p className="text-sm text-foreground mt-1">
              {suggestion.description}
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to={suggestion.href}>{suggestion.ctaLabel}</Link>
          </Button>
        </div>
      ) : null}
    </MomentumCard>
  );
}
