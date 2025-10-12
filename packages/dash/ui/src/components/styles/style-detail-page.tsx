import { Badge } from "@openpromo/ui/components/badge";
import { Button } from "@openpromo/ui/components/button";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import { Link, useParams } from "@tanstack/react-router";
import { ChevronLeft, ImageOff } from "lucide-react";
import { useMemo } from "react";
import type { StyleResponse } from "@/queries/styles";
import {
  useStyleDetailsQuery,
  useStyleGenerationsQuery,
} from "@/queries/styles";

const formatDate = (
  value: string | Date | null | undefined,
): string | undefined => {
  if (!value) return undefined;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const buildMetadata = (style: StyleResponse["style"]) => {
  const metadata: Array<{ label: string; value: string }> = [];

  if (style.slug) {
    metadata.push({ label: "Slug", value: style.slug });
  }

  if (style.creatorID) {
    metadata.push({ label: "Creator", value: style.creatorID });
  }

  const createdAt = formatDate(style.createdAt);
  if (createdAt) {
    metadata.push({ label: "Created", value: createdAt });
  }

  const updatedAt = formatDate(style.updatedAt);
  if (updatedAt) {
    metadata.push({ label: "Updated", value: updatedAt });
  }

  metadata.push({ label: "Style ID", value: style.id });

  return metadata;
};

export function StyleDetailPage() {
  const params = useParams({
    from: "/_authenticated/workspaces/$workspaceSlug/styles/$styleId",
  });
  const { styleId, workspaceSlug } = params;
  const { data, isLoading, error } = useStyleDetailsQuery(styleId);
  const generationsQuery = useStyleGenerationsQuery(styleId, {
    pageSize: String(12),
  });

  const style = data?.style;

  const [heroImage, galleryImages] = useMemo(() => {
    const refs = style?.imageRefs ?? [];
    return [refs[0], refs.slice(1)];
  }, [style]);

  const generations = generationsQuery.data?.generations ?? [];
  const generationTotal = generationsQuery.data?.pagination.total ?? 0;

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

  const metadata = buildMetadata(style);

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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-xl border border-border/60 bg-muted/20">
            {heroImage ? (
              <img
                src={heroImage}
                alt={style.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <ImageOff className="h-8 w-8" />
                <span className="text-xs">No primary image</span>
              </div>
            )}
          </div>

          {galleryImages.length > 0 && (
            <div className="rounded-xl border border-border/60 bg-background/60 p-4">
              <h2 className="text-sm font-semibold text-muted-foreground">
                Gallery
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {galleryImages.map((image) => (
                  <div
                    key={image}
                    className="relative overflow-hidden rounded-lg border border-border/40 bg-muted/20"
                  >
                    <img
                      src={image}
                      alt={`${style.name} preview`}
                      className="aspect-square w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <section className="rounded-xl border border-border/70 bg-background/80 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Details
            </h2>
            <dl className="mt-3 space-y-3 text-sm">
              {metadata.map((item) => (
                <div
                  key={`${item.label}-${item.value}`}
                  className="flex justify-between gap-3"
                >
                  <dt className="text-muted-foreground">{item.label}</dt>
                  <dd className="font-medium text-foreground">{item.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {style.imageGenPrompt && (
            <section className="rounded-xl border border-border/70 bg-background/80 p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Image Prompt
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {style.imageGenPrompt}
              </p>
            </section>
          )}
        </aside>
      </div>

      <section className="rounded-xl border border-border/70 bg-background/80 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recent Generations
          </h2>
          {generationTotal > 0 ? (
            <span className="text-xs text-muted-foreground">
              {generationTotal} total
            </span>
          ) : null}
        </div>

        {generationsQuery.isLoading ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeletons
                key={index}
                className="aspect-square w-full rounded-lg"
              />
            ))}
          </div>
        ) : generationsQuery.isError ? (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center text-sm text-destructive">
            Failed to load generated images.
          </div>
        ) : generations.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {generations.map((generation) => {
              const coverImage = generation.outputImages?.[0];
              const createdAt = formatDate(generation.createdAt);

              return (
                <div
                  key={generation.id}
                  className="group relative overflow-hidden rounded-lg border border-border/60 bg-muted/20"
                >
                  {coverImage ? (
                    <img
                      src={coverImage}
                      alt={`${style.name} generation`}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-36 items-center justify-center text-xs text-muted-foreground">
                      No image available
                    </div>
                  )}

                  <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 text-xs text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    {createdAt && (
                      <span className="font-medium tracking-wide">
                        {createdAt}
                      </span>
                    )}
                    {generation.prompt && (
                      <p className="line-clamp-2 text-[11px] text-white/80">
                        {generation.prompt}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-border/60 bg-background/60 p-6 text-center text-sm text-muted-foreground">
            No generated images yet. Generate assets with this style to see them
            here.
          </div>
        )}
      </section>
    </div>
  );
}

export function StyleDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-9 w-40" />

      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-2/3" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Skeleton className="aspect-[4/3] w-full rounded-xl" />
          <div className="rounded-xl border border-border/60 bg-background/60 p-4">
            <Skeleton className="h-4 w-24" />
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Skeleton className="aspect-square w-full rounded-lg" />
              <Skeleton className="aspect-square w-full rounded-lg" />
              <Skeleton className="aspect-square w-full rounded-lg" />
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <div className="rounded-xl border border-border/70 bg-background/80 p-4 space-y-3">
            <Skeleton className="h-4 w-20" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/80 p-4 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-16 w-full" />
          </div>
        </aside>
      </div>

      <div className="rounded-xl border border-border/70 bg-background/80 p-4 space-y-4">
        <Skeleton className="h-4 w-28" />
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton
              // biome-ignore lint/suspicious/noArrayIndexKey: placeholder list
              key={index}
              className="aspect-square w-full rounded-lg"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
