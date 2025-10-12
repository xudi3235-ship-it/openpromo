import { Badge } from "@openpromo/ui/components/badge";
import { Card, CardContent, CardHeader } from "@openpromo/ui/components/card";
import type { StyleResponse } from "@/queries/styles";

interface StyleCardProps {
  style: StyleResponse["style"];
}

export function StyleCard({ style }: StyleCardProps) {
  const [primaryImage, ...otherRefs] = style.imageRefs;

  return (
    <Card className="overflow-hidden border border-border/60 bg-card">
      <CardHeader className="p-0">
        <div className="aspect-video w-full overflow-hidden bg-muted">
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={style.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-5xl">
              🎨
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">
              {style.name}
            </h3>
            <Badge variant="secondary" className="text-xs font-normal">
              {style.slug}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{style.description}</p>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Image Prompt
          </p>
          <p className="text-sm text-muted-foreground whitespace-pre-line">
            {style.imageGenPrompt}
          </p>
        </div>

        {otherRefs.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {otherRefs.slice(0, 4).map((ref) => (
              <div
                key={ref}
                className="h-16 w-16 overflow-hidden rounded-md border border-border/50 bg-muted"
              >
                <img
                  src={ref}
                  alt={`${style.name} reference`}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
