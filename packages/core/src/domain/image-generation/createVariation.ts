import { Replicate } from "@core/providers/replicate/models";
import { filterNulls } from "@core/utils/common";
import { EntImageGeneration } from "./EntImageGeneration";
import { ProductImageGenerator } from "./product-image-generator";

// do not delete, keep this since it could be used for encoding images
export async function _toDataUri(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith("data:")) {
    return imageUrl;
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch reference image: ${response.status} ${response.statusText}`,
    );
  }

  const contentType =
    response.headers.get("content-type") ?? "application/octet-stream";
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return `data:${contentType};base64,${base64}`;
}

export async function createVariationFromParent(params: {
  parentGenerationId: string;
  prompt?: string;
  styleId?: string;
  referenceImageUrl?: string;
}) {
  const parent = await EntImageGeneration.fromID(params.parentGenerationId);
  const productId = parent.productId();
  if (!productId) {
    throw new Error("Parent generation missing product reference");
  }

  const fallbackReference =
    parent.data.outputImages?.[0] ?? parent.referenceImageUrl();
  const referenceImageUrl = params.referenceImageUrl ?? fallbackReference;

  const styleId = params.styleId ?? parent.styleId() ?? undefined;

  const generation = await EntImageGeneration.create({
    state: "pending",
    productId,
    styleComponentId: styleId ?? null,
    parentGenerationId: parent.data.id,
    metadata: {
      prompt: params.prompt,
      referenceImageUrl,
      parentGenerationId: parent.data.id,
    },
  });

  return {
    parent,
    generation,
    referenceImageUrl,
    prompt: params.prompt ?? "",
    styleId,
  };
}

export async function generateVariationImage(params: {
  generation: EntImageGeneration;
  prompt: string;
  referenceImageUrl?: string;
}) {
  const optimizedPrompt = await generateVariationPrompt({
    generation: params.generation,
    prompt: params.prompt,
    referenceImageUrl: params.referenceImageUrl,
  });

  const outputImages = params.generation.outputImages();
  const inputImages = filterNulls([...outputImages, params.referenceImageUrl]);

  if (inputImages.length === 0) {
    throw new Error(
      "Variation generation requires at least one reference image",
    );
  }

  const imageUrl = await Replicate.NanoBanana.run({
    prompt: optimizedPrompt,
    image_input: inputImages,
    aspect_ratio: "match_input_image",
    pro: true,
  });

  console.log("Generated variation image URL:", imageUrl);
  console.log("Generated variation prompt:", optimizedPrompt);

  await params.generation.update({
    outputImages: [imageUrl],
    state: "completed",
    metadata: {
      ...(params.generation.data.metadata ?? {}),
      variationPrompt: params.prompt,
      referenceImageUrl: params.referenceImageUrl,
      generatedPrompt: optimizedPrompt,
      inputImages,
    },
  });

  return params.generation;
}

async function generateVariationPrompt(params: {
  generation: EntImageGeneration;
  prompt: string;
  referenceImageUrl?: string;
}) {
  const productId = params.generation.productId();
  if (!productId) {
    throw new Error("Generation missing product reference");
  }

  const generator = await ProductImageGenerator.fromParams({
    productId,
    styleId: params.generation.styleId() ?? undefined,
    referenceImageUrl: params.referenceImageUrl,
    prompt: `CRITICAL: help me enhance the following prompt for generating an image variation that closely resembles the style and composition of the reference image provided. The goal is to maintain the overall shape of image, makiing tweaks & adjustments. no major breaking changes. So focus on describing the delta/changes.

    my custom instructions:
    ${params.prompt}`,
  });

  return generator.generatePrompt();
}
