import type { SharedAttachmentSpec } from "@shared/content";
import { useEffect, useMemo, useState } from "react";

interface MediaDimensions {
  width?: number;
  height?: number;
  aspectRatio: string | null;
  source: "metadata" | "file" | null;
}

const isFinitePositiveNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

const pickFirstNumber = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    if (isFinitePositiveNumber(value)) {
      return value;
    }
  }
  return undefined;
};

const gcd = (a: number, b: number): number => {
  let x = Math.abs(a);
  let y = Math.abs(b);

  while (y !== 0) {
    const temp = y;
    y = x % y;
    x = temp;
  }

  return x;
};

const formatAspectRatioFromDimensions = (
  width?: number,
  height?: number,
): string | null => {
  if (!isFinitePositiveNumber(width) || !isFinitePositiveNumber(height)) {
    return null;
  }

  const roundedWidth = Math.round(width);
  const roundedHeight = Math.round(height);

  if (roundedWidth <= 0 || roundedHeight <= 0) {
    return null;
  }

  const divisor = gcd(roundedWidth, roundedHeight);
  if (!divisor) return null;

  const normalizedWidth = Math.round(roundedWidth / divisor);
  const normalizedHeight = Math.round(roundedHeight / divisor);

  if (normalizedWidth <= 0 || normalizedHeight <= 0) {
    return null;
  }

  return `${normalizedWidth}:${normalizedHeight}`;
};

const extractMetadataDimensions = (
  attachment?: SharedAttachmentSpec,
): MediaDimensions => {
  if (!attachment) {
    return { aspectRatio: null, source: null };
  }

  const metadata = attachment.metadata as Record<string, unknown> | undefined;
  const width = pickFirstNumber(
    attachment.width,
    metadata?.width,
    metadata?.videoWidth,
    metadata?.naturalWidth,
    metadata?.originalWidth,
  );
  const height = pickFirstNumber(
    attachment.height,
    metadata?.height,
    metadata?.videoHeight,
    metadata?.naturalHeight,
    metadata?.originalHeight,
  );

  const normalizedWidth = isFinitePositiveNumber(width) ? width : undefined;
  const normalizedHeight = isFinitePositiveNumber(height) ? height : undefined;

  const rawRatio =
    typeof metadata?.aspectRatio === "string"
      ? metadata.aspectRatio.trim()
      : "";

  if (rawRatio && rawRatio.toLowerCase() !== "unknown") {
    return {
      width: normalizedWidth,
      height: normalizedHeight,
      aspectRatio: rawRatio,
      source: "metadata",
    };
  }

  const computedRatio = formatAspectRatioFromDimensions(
    normalizedWidth,
    normalizedHeight,
  );

  if (computedRatio) {
    return {
      width: normalizedWidth,
      height: normalizedHeight,
      aspectRatio: computedRatio,
      source: "metadata",
    };
  }

  if (normalizedWidth && normalizedHeight) {
    return {
      width: normalizedWidth,
      height: normalizedHeight,
      aspectRatio: `${Math.round(normalizedWidth)}:${Math.round(normalizedHeight)}`,
      source: "metadata",
    };
  }

  return {
    width: normalizedWidth,
    height: normalizedHeight,
    aspectRatio: null,
    source: null,
  };
};

export function useMediaDimensions(attachment?: SharedAttachmentSpec) {
  const metadataDimensions = useMemo(
    () => extractMetadataDimensions(attachment),
    [attachment],
  );

  const [dimensions, setDimensions] =
    useState<MediaDimensions>(metadataDimensions);

  useEffect(() => {
    setDimensions(metadataDimensions);
  }, [
    metadataDimensions.aspectRatio,
    metadataDimensions.height,
    metadataDimensions.width,
    metadataDimensions,
  ]);

  useEffect(() => {
    if (!attachment) return;
    if (metadataDimensions.aspectRatio) return;
    if (typeof window === "undefined") return;

    const file = attachment.file;
    if (!file) return;

    let isCancelled = false;
    let objectUrl: string | undefined;

    const finalize = (width?: number, height?: number) => {
      if (isCancelled) return;
      if (!isFinitePositiveNumber(width) || !isFinitePositiveNumber(height)) {
        return;
      }

      const aspectRatio =
        formatAspectRatioFromDimensions(width, height) ??
        `${Math.round(width)}:${Math.round(height)}`;

      setDimensions({
        width,
        height,
        aspectRatio,
        source: "file",
      });
    };

    const cleanup = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = undefined;
      }
    };

    if (attachment.type === "photo") {
      const img = new Image();
      objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        finalize(img.naturalWidth, img.naturalHeight);
        cleanup();
      };
      img.onerror = cleanup;
      img.src = objectUrl;
    } else if (attachment.type === "video") {
      const video = document.createElement("video");
      objectUrl = URL.createObjectURL(file);
      video.preload = "metadata";
      video.muted = true;
      video.onloadedmetadata = () => {
        finalize(video.videoWidth, video.videoHeight);
        cleanup();
      };
      video.onerror = cleanup;
      video.src = objectUrl;
      video.load();
    }

    return () => {
      isCancelled = true;
      cleanup();
    };
  }, [attachment, metadataDimensions.aspectRatio]);

  return dimensions;
}
