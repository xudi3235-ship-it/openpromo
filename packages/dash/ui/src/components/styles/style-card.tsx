import { Badge } from "@openpromo/ui/components/badge";
import type { StyleResponse } from "@/queries/styles";

interface StyleCardProps {
  style: StyleResponse["style"];
}

export function StyleCard({ style }: StyleCardProps) {
  const [primaryImage, ...otherRefs] = style.imageRefs;

  return (
    <div className="group flex items-start gap-4 rounded-2xl bg-background/60 p-4 shadow-sm ring-1 ring-border/10 transition-all duration-300 hover:-translate-y-1 hover:ring-border/20">
      <div className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-xl bg-muted">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={style.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-muted-foreground/50">
            🎨
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-foreground">
            {style.name}
          </h3>
          <Badge
            variant="outline"
            className="border-border/30 text-xs font-medium uppercase tracking-wide"
          >
            {style.slug}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2">
          {style.description}
        </p>

        <p className="text-xs text-muted-foreground/80 line-clamp-3 whitespace-pre-line">
          {style.imageGenPrompt}
        </p>

        {otherRefs.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {otherRefs.slice(0, 4).map((ref) => (
              <div
                key={ref}
                className="h-12 w-12 overflow-hidden rounded-lg border border-border/20 bg-muted"
              >
                <img
                  src={ref}
                  alt={`${style.name} reference`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
