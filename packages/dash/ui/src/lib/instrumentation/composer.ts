import type {
  CaptionPlatform,
  CaptionValidationState,
} from "@/lib/caption-limit";

export interface ComposerEvent {
  has_text: boolean;
  has_media: boolean;
  platforms: CaptionPlatform[];
  validation: CaptionValidationState;
  action?: "publish_click";
}

export function logComposerEvent(event: ComposerEvent) {
  if (typeof console !== "undefined" && typeof console.info === "function") {
    console.info("[composer]", event);
  }
}
