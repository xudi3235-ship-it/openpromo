import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@openpromo/ui/components/avatar";
import { Badge } from "@openpromo/ui/components/badge";
import type { StyleResponse } from "@/queries/styles";
import { StyleCardActions } from "./style-card-actions";

interface StyleCardProps {
  style: StyleResponse["style"];
}

// Mock creator data - TODO: Replace with real data from API
const getCreatorForStyle = (styleName: string) => {
  const creators = [
    {
      name: "Alex Chen",
      avatar: "https://i.pravatar.cc/150?img=12",
      initials: "AC",
    },
    {
      name: "Sarah Miller",
      avatar: "https://i.pravatar.cc/150?img=45",
      initials: "SM",
    },
    {
      name: "Jordan Lee",
      avatar: "https://i.pravatar.cc/150?img=33",
      initials: "JL",
    },
    {
      name: "Taylor Brown",
      avatar: "https://i.pravatar.cc/150?img=27",
      initials: "TB",
    },
  ];

  // Use hash to consistently assign same creator to same style
  const hash = styleName
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return creators[hash % creators.length];
};

export function StyleCard({ style }: StyleCardProps) {
  const [primaryImage, ...otherRefs] = style.imageRefs;
  const imageCount = style.imageRefs.length;
  const creator = getCreatorForStyle(style.name);

  return (
    <div className="group relative aspect-[3/4] overflow-hidden rounded-lg bg-muted transition-all duration-300 hover:shadow-xl">
      {/* Main Image */}
      {primaryImage ? (
        <img
          src={primaryImage}
          alt={style.name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
          <div className="text-6xl opacity-30">🎨</div>
        </div>
      )}

      {/* Top Right Actions */}
      <div className="absolute right-2 top-2 z-20 flex items-center gap-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        {/* Image Count Badge - Visible on hover */}
        {imageCount > 0 && (
          <div className="rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {imageCount} {imageCount === 1 ? "image" : "images"}
          </div>
        )}

        {/* Actions Dropdown - Visible on hover */}
        <StyleCardActions style={style} />
      </div>

      {/* Overlay with metadata - Appears on hover */}
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="flex h-full flex-col justify-end p-4">
          {/* Title */}
          <h3 className="mb-2 text-lg font-bold text-white">{style.name}</h3>

          {/* Description */}
          <p className="mb-3 text-sm text-white/90 line-clamp-2">
            {style.description}
          </p>

          {/* Metadata row */}
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="bg-white/20 text-xs text-white backdrop-blur-sm hover:bg-white/30"
            >
              {style.slug}
            </Badge>
          </div>

          {/* Prompt preview */}
          {style.imageGenPrompt && (
            <p className="mt-3 text-xs text-white/70 line-clamp-2">
              {style.imageGenPrompt}
            </p>
          )}

          {/* Additional images preview */}
          {otherRefs.length > 0 && (
            <div className="mt-3 flex gap-1">
              {otherRefs.slice(0, 3).map((ref, idx) => (
                <div
                  key={ref}
                  className="h-8 w-8 overflow-hidden rounded border border-white/20 bg-black/20 backdrop-blur-sm"
                >
                  <img
                    src={ref}
                    alt={`${style.name} ${idx + 2}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
              {otherRefs.length > 3 && (
                <div className="flex h-8 w-8 items-center justify-center rounded border border-white/20 bg-black/40 text-xs text-white backdrop-blur-sm">
                  +{otherRefs.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Creator Avatar - Bottom Right on Hover */}
      <div className="absolute bottom-3 right-3 z-20 translate-y-8 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
        <Avatar className="size-10 ring-2 ring-white/20 transition-all duration-300 hover:ring-white/40">
          <AvatarImage src={creator.avatar} alt={creator.name} />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-xs font-semibold text-white">
            {creator.initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}
