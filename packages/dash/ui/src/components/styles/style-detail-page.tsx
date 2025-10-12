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

      <div className="grid gap-8 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl bg-muted/20">
            {heroImage ? (
              <img
                src={heroImage}
                alt={style.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[5/6] w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <ImageOff className="h-8 w-8" />
                <span className="text-xs">No primary image</span>
              </div>
            )}
          </div>

          {galleryImages.length > 0 && (
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
              {galleryImages.slice(0, 6).map((image) => (
                <img
                  key={image}
                  src={image}
                  alt={`${style.name} preview`}
                  className="aspect-square w-full rounded-lg object-cover"
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4 text-sm text-muted-foreground">
          {style.creatorID && (
            <p>
              <span className="uppercase text-[11px] tracking-wide">
                Creator
              </span>
              <br />
              <span className="font-medium text-foreground">
                {style.creatorID}
              </span>
            </p>
          )}

          <p>
            <span className="uppercase text-[11px] tracking-wide">
              Style ID
            </span>
            <br />
            <span className="font-medium text-foreground">{style.id}</span>
          </p>

          {metadata.length > 0 && (
            <dl className="space-y-1 text-xs">
              {metadata.map((item) => (
                <div key={`${item.label}-${item.value}`}>
                  <dt className="inline text-muted-foreground">
                    {item.label}:
                  </dt>{" "}
                  <dd className="inline text-foreground">{item.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {style.imageGenPrompt && (
            <div className="space-y-2">
              <span className="uppercase text-[11px] tracking-wide">
                Prompt Blueprint
              </span>
              <p className="whitespace-pre-wrap leading-relaxed text-foreground">
                {style.imageGenPrompt}
              </p>
            </div>
          )}
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recent Generations
          </h2>
          {generationTotal > 0 ? (
            <span className="text-xs text-muted-foreground">
              {generationTotal} saved
            </span>
          ) : null}
        </div>

        {generationsQuery.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton
                // biome-ignore lint/suspicious/noArrayIndexKey: placeholder list
                key={index}
                className="aspect-[4/5] w-full rounded-lg"
              />
            ))}
          </div>
        ) : generationsQuery.isError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center text-sm text-destructive">
            Failed to load generated images.
          </div>
        ) : generations.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {generations.map((generation) => {
              const coverImage = generation.outputImages?.[0];
              const createdAt = formatDate(generation.createdAt);

              return (
                <div
                  key={generation.id}
                  className="group relative overflow-hidden rounded-lg bg-muted/20"
                >
                  {coverImage ? (
                    <img
                      src={coverImage}
                      alt={`${style.name} generation`}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
                      No image available
                    </div>
                  )}

                  <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/80 via-black/25 to-transparent p-4 text-xs text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    {createdAt && (
                      <span className="font-medium tracking-wide">
                        {createdAt}
                      </span>
                    )}
                    {generation.prompt && (
                      <p className="line-clamp-3 text-[11px] text-white/80">
                        {generation.prompt}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border/60 bg-background/60 p-6 text-center text-sm text-muted-foreground">
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
        <Skeleton className="h-8 w-60" />
        <Skeleton className="h-4 w-2/3" />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Skeleton className="aspect-[5/6] w-full rounded-xl" />
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton
                // biome-ignore lint/suspicious/noArrayIndexKey: placeholder list
                key={index}
                className="aspect-square w-full rounded-lg"
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>

      <div className="space-y-3">
        <Skeleton className="h-4 w-36" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: placeholder list
            <Skeleton key={index} className="aspect-[4/5] w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
