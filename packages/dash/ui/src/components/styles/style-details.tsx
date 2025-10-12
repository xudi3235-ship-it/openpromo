import { ImageOff } from "lucide-react";
import type { StyleResponse } from "@/queries/styles";

interface StyleDetailsProps {
  style: StyleResponse["style"];
}

export function StyleDetails({ style }: StyleDetailsProps) {
  const [heroImage, ...galleryImages] = style.imageRefs;

  const metadata: Array<{ label: string; value: string }> = [];
  if (style.slug) {
    metadata.push({ label: "Slug", value: style.slug });
  }

  return (
    <div className="space-y-6">
      {/* Hero Image */}
      <div className="mx-auto max-w-md overflow-hidden rounded-xl bg-muted/20">
        {heroImage ? (
          <img
            src={heroImage}
            alt={style.name}
            className="aspect-[3/4] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageOff className="h-8 w-8" />
            <span className="text-xs">No primary image</span>
          </div>
        )}
      </div>

      {/* Gallery Images */}
      {galleryImages.length > 0 && (
        <div className="grid gap-2 grid-cols-3 sm:grid-cols-4">
          {galleryImages.slice(0, 8).map((image) => (
            <img
              key={image}
              src={image}
              alt={`${style.name} preview`}
              className="aspect-square w-full rounded-lg object-cover"
            />
          ))}
        </div>
      )}

      {/* Metadata Section */}
      <div className="space-y-3 rounded-lg border border-border/40 bg-muted/20 p-4 text-xs">
        <h3 className="font-semibold uppercase tracking-wide text-muted-foreground">
          Details
        </h3>

        <div className="space-y-2 text-muted-foreground">
          {style.creatorID && (
            <div>
              <span className="font-medium text-foreground">Creator:</span>{" "}
              {style.creatorID}
            </div>
          )}

          <div>
            <span className="font-medium text-foreground">Style ID:</span>{" "}
            {style.id}
          </div>

          {metadata.map((item) => (
            <div key={`${item.label}-${item.value}`}>
              <span className="font-medium text-foreground">{item.label}:</span>{" "}
              {item.value}
            </div>
          ))}
        </div>

        {style.imageGenPrompt && (
          <div className="space-y-1.5 pt-2 border-t border-border/40">
            <span className="font-semibold uppercase tracking-wide text-muted-foreground">
              Prompt Blueprint
            </span>
            <p className="whitespace-pre-wrap leading-relaxed text-foreground">
              {style.imageGenPrompt}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
