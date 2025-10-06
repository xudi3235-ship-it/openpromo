import type { Platform } from "@core/schemas/connected-account.sql";
import type { IconType } from "react-icons";
import { FaFacebook, FaInstagram, FaTiktok } from "react-icons/fa";

export interface PlatformMeta {
  label: string;
  abbreviation: string;
  avatarGradient: string;
  accentTextClass: string;
  accentRingClass: string;
  accentIndicatorClass: string;
  accentColor: string;
  icon: IconType;
}

const PLATFORM_META: Record<Platform, PlatformMeta> = {
  FACEBOOK: {
    label: "Facebook",
    abbreviation: "FB",
    avatarGradient: "from-blue-500 to-blue-600",
    accentTextClass: "text-[#1877F2]",
    accentRingClass: "ring-[#1877F266]",
    accentIndicatorClass: "bg-[#1877F249]",
    accentColor: "#1877F2",
    icon: FaFacebook,
  },
  INSTAGRAM: {
    label: "Instagram",
    abbreviation: "IG",
    avatarGradient: "from-purple-500 via-pink-500 to-orange-500",
    accentTextClass: "text-[#d62976]",
    accentRingClass: "ring-[#d6297650]",
    accentIndicatorClass: "bg-[#d6297633]",
    accentColor: "#d62976",
    icon: FaInstagram,
  },
  TIKTOK: {
    label: "TikTok",
    abbreviation: "TT",
    avatarGradient: "from-black to-gray-800",
    accentTextClass: "text-black dark:text-white",
    accentRingClass: "ring-black/40 dark:ring-white/40",
    accentIndicatorClass: "bg-black/20 dark:bg-white/20",
    accentColor: "#000000",
    icon: FaTiktok,
  },
};

export function getPlatformMeta(platform: Platform): PlatformMeta {
  return PLATFORM_META[platform] ?? PLATFORM_META.FACEBOOK;
}
