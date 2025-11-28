import { GenAI } from "../genai/helpers";
import { EntImageGeneration } from "./EntImageGeneration";

async function toDataUri(imageUrl: string): Promise<string> {
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

  const referenceImageUrl = parent.referenceImageUrl();
  if (!referenceImageUrl) {
    throw new Error("Parent generation missing reference image");
  }

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
  referenceImageUrl: string;
}) {
  const dataUri = await toDataUri(params.referenceImageUrl);
  const imageUrl = await GenAI.runNanoBanana({
    prompt: params.prompt,
    image_input: [dataUri],
    aspect_ratio: "match_input_image",
  });

  console.log("Generated variation image URL:", imageUrl);

  await params.generation.update({
    outputImages: [imageUrl],
    state: "completed",
    metadata: {
      ...(params.generation.data.metadata ?? {}),
      variationPrompt: params.prompt,
      referenceImageUrl: params.referenceImageUrl,
    },
  });

  return params.generation;
}
