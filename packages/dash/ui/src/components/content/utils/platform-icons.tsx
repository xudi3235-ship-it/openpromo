import type { AllPlacement } from "@shared/content";
import { FaFacebook, FaInstagram, FaTiktok } from "react-icons/fa";

export function getPlatformIcon(placement: AllPlacement) {
  if (placement.startsWith("FB_")) {
    return <FaFacebook className="w-2.5 h-2.5 text-blue-600" />;
  }

  if (placement.startsWith("IG_")) {
    return <FaInstagram className="w-2.5 h-2.5 text-pink-600" />;
  }

  if (placement.startsWith("TT_")) {
    return (
      <FaTiktok className="w-2.5 h-2.5 text-gradient-to-br from-pink-500 via-blue-500 to-green-500" />
    );
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
  if (placement.startsWith("TT_")) {
    return "TikTok";
  }

  return "Unknown";
}
