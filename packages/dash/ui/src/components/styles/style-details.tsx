import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@openpromo/ui/components/carousel";
import { ImageOff } from "lucide-react";
import type { StyleResponse } from "@/queries/styles";

interface StyleDetailsProps {
  style: StyleResponse["style"];
}

export function StyleDetails({ style }: StyleDetailsProps) {
  const images = style.imageRefs;

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      {images.length > 0 ? (
        <Carousel className="w-full">
          <CarouselContent className="h-full">
            {images.map((image) => (
              <CarouselItem key={image}>
                <div className="overflow-hidden rounded-xl bg-muted/20">
                  <img
                    src={image}
                    alt={style.name}
                    className="aspect-[3/4] w-full object-cover"
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden sm:flex" />
          <CarouselNext className="hidden sm:flex" />
        </Carousel>
      ) : (
        <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/40 bg-muted/10 text-muted-foreground">
          <ImageOff className="h-8 w-8" />
          <span className="text-xs">No images generated yet</span>
        </div>
      )}
    </div>
  );
}
