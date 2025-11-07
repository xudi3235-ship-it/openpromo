import { Button } from "@openpromo/ui/components/button";
import { cn } from "@openpromo/ui/lib/utils";
import type { InsightNarrativeHighlight } from "@shared/insights";
import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

type HomeHeroCardProps = {
  workspaceSlug: string;
  workspaceName?: string;
  highlight?: InsightNarrativeHighlight;
  streak?: number;
  isLoading?: boolean;
};

export function HomeHeroCard({
  workspaceSlug,
  workspaceName,
  highlight,
  streak,
  isLoading,
}: HomeHeroCardProps) {
  const title = highlight?.headline ?? "Insights are almost ready";
  const description =
    highlight?.body ??
    "Connect your channels and publish your first post to unlock personalized guidance.";

  return (
    <div className="bg-gradient-to-br from-primary/15 via-background to-background border border-border/40 rounded-2xl p-6 md:p-8 shadow-sm">
      <div className="flex items-start gap-4 flex-col md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            {workspaceName ?? "Your workspace"}
          </div>
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            {description}
          </p>
          {streak ? (
            <div className="text-xs font-medium text-emerald-500 bg-emerald-500/10 rounded-full px-3 py-1 inline-flex">
              {streak}-week publishing streak
            </div>
          ) : null}
        </div>
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <Button asChild disabled={isLoading}>
            <Link
              to="/workspaces/$workspaceSlug/composer"
              params={{ workspaceSlug }}
            >
              Create post
            </Link>
          </Button>
          <Button
            variant="outline"
            asChild
            disabled={isLoading}
            className={cn(streak ? "border-emerald-500/40" : undefined)}
          >
            <Link
              to="/workspaces/$workspaceSlug/insights"
              params={{ workspaceSlug }}
            >
              View insights
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
