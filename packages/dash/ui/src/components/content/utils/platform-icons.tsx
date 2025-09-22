import type { AllPlacement } from "@core/schemas/content.sql";
import { Facebook, Instagram } from "lucide-react";

export function getPlatformIcon(placement: AllPlacement) {
  if (placement.startsWith("FB_")) {
    return <Facebook className="w-4 h-4 text-blue-600" />;
  }

  if (placement.startsWith("IG_")) {
    return <Instagram className="w-4 h-4 text-pink-600" />;
  }

  return null;
}

export function getPlatformName(placement: AllPlacement): string {
  if (placement.startsWith("FB_")) {
    return "Facebook";
  }

  if (placement.startsWith("IG_")) {
    return "Instagram";
  }

  return "Unknown";
}
