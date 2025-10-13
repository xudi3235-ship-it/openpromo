import { Badge } from "@openpromo/ui/components/badge";
import { Button } from "@openpromo/ui/components/button";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import { Link, useParams } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useStyleDetailsQuery } from "@/queries/styles";
import { GenerationsInfiniteGrid } from "./generations-infinite-grid";
import { StyleDetails } from "./style-details";

/**
 * StyleDetailPage - Displays style details and associated generations
 * Route: /workspaces/:workspaceSlug/styles/:styleId
 */
export function StyleDetailPage() {
  const params = useParams({
    from: "/_authenticated/workspaces/$workspaceSlug/styles/$styleId",
  });
  const { styleId, workspaceSlug } = params;
  const { data, isLoading, error } = useStyleDetailsQuery(styleId);

  const style = data?.style;

  if (isLoading) {
    return <StyleDetailSkeleton />;
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-4 text-center text-sm text-destructive">
          Failed to load style details.
        </div>
      </div>
    );
  }

  if (!style) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-lg border border-border/60 bg-muted/30 px-6 py-4 text-sm text-muted-foreground">
          Style not found.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link to="/workspaces/$workspaceSlug/styles" params={{ workspaceSlug }}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to styles
        </Link>
      </Button>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {style.name}
          </h1>
          {style.isOfficial && (
            <Badge className="bg-emerald-500/15 text-emerald-600">
              Official
            </Badge>
          )}
          {style.slug && (
            <Badge variant="outline" className="text-xs font-medium">
              {style.slug}
            </Badge>
          )}
        </div>
        {style.description && (
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {style.description}
          </p>
        )}
      </header>

      {/* Two-column layout: Left = Style Details, Right = Recent Generations */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        {/* Left Column: Style Details */}
        <StyleDetails style={style} />

        {/* Right Column: Recent Generations */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recent Generations
          </h2>
          <div className="max-h-[calc(100vh-16rem)] overflow-y-auto pr-2">
            <GenerationsInfiniteGrid
              styleId={styleId}
              styleName={style.name}
              onGenerateClick={() => {
                // TODO: Open generation modal/dialog
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function StyleDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-9 w-40" />

      <div className="space-y-3">
        <Skeleton className="h-8 w-60" />
        <Skeleton className="h-4 w-2/3" />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        {/* Left Column Skeleton */}
        <div className="flex w-full max-w-sm flex-col gap-4">
          <Skeleton className="aspect-[3/4] w-full rounded-xl" />
          <div className="flex items-center justify-between px-6">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-2 w-24" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>

        {/* Right Column Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-4 w-36" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton
                // biome-ignore lint/suspicious/noArrayIndexKey: placeholder list
                key={index}
                className="aspect-[3/4] w-full rounded-lg"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
