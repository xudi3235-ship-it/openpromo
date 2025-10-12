import type { StyleComponent, StyleName } from "@shared/product";

// registry
const skinPortrait: StyleComponent = {
  name: "skin_portrait_korean",
  imageRefs: [
    "https://bucket.openpromo.app/styles/korean_skin_portrait/best.png",
    "https://bucket.openpromo.app/styles/korean_skin_portrait/b831cf1d41afd.png",
    "https://bucket.openpromo.app/styles/korean_skin_portrait/d869f50765adb.png",
    "https://bucket.openpromo.app/styles/korean_skin_portrait/fd186e19b41bf.png",
  ],
  description:
    "studio shot, close-up potrait of korean model face with glowy skin and natural lighting n skin texture. suitable for beauty, skincare, makeup products etc.",
  imageGenPrompt: "TODO: you are gonna replace me",
};

export const allStyleComponents: Map<StyleName, StyleComponent> = new Map([
  [skinPortrait.name, skinPortrait],
]);
