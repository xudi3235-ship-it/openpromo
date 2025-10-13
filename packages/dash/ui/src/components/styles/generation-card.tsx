import type { StyleGenerationsResponse } from "@/queries/styles";

type Generation = StyleGenerationsResponse["generations"][number];

interface GenerationCardProps {
  generation: Generation;
  styleName: string;
}

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

export function GenerationCard({ generation, styleName }: GenerationCardProps) {
  const coverImage = generation.outputImages?.[0];
  const createdAt = formatDate(generation.createdAt);

  return (
    <div className="group relative aspect-[3/4] overflow-hidden rounded-lg bg-muted/20">
      {coverImage ? (
        <img
          src={coverImage}
          alt={`${styleName} generation`}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
          No image available
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 text-xs text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        {createdAt && (
          <span className="font-medium tracking-wide">{createdAt}</span>
        )}
      </div>
    </div>
  );
}
