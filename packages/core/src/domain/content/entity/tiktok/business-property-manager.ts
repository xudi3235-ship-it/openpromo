import { Storage } from "@core/helpers/storage";
import { WorkflowError } from "@core/utils/error";
import { Log } from "@core/utils/log";
import type { TikTokBusinessAPIClient } from "./business-api-client";

const log = Log.create({ namespace: "tiktok-business-property-manager" });

const BUSINESS_STORAGE_ROOT = "tiktok-business";

function ensurePublicBucketUrl(): string {
  const baseUrl = Storage.PUBLIC_BUCKET.publicUrl;
  if (!baseUrl) {
    throw new WorkflowError(
      "Storage public bucket missing publicUrl configuration for TikTok Business verification",
    );
  }
  return baseUrl.replace(/\/+$/, "");
}

export function buildTikTokBusinessPrefixes(businessId: string) {
  const baseUrl = ensurePublicBucketUrl();
  const keyPrefix = `${BUSINESS_STORAGE_ROOT}/${businessId}/`;
  const urlPrefix = `${baseUrl}/${keyPrefix}`;
  return { keyPrefix, urlPrefix };
}

async function uploadVerificationFile(
  keyPrefix: string,
  fileName: string,
  signature: string,
) {
  const key = `${keyPrefix}${fileName}`;
  await Storage.upload(key, signature, Storage.PUBLIC_BUCKET, {
    contentType: "text/plain",
    metadata: {
      provider: "tiktok-business",
      purpose: "url-prefix-verification",
    },
    acl: "public-read",
  });
  log.info("Uploaded TikTok Business verification file", {
    key,
  });
}

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "") + "/";
}

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function ensureTikTokBusinessUrlPrefixVerified(
  client: TikTokBusinessAPIClient,
): Promise<{ keyPrefix: string; urlPrefix: string }> {
  const { keyPrefix, urlPrefix } = buildTikTokBusinessPrefixes(
    client.identity.businessId,
  );
  const normalizedPrefix = normalizeUrl(urlPrefix);

  const existingProperties = await client.listUrlProperties();
  const existing = existingProperties.find(
    (property) =>
      property.property_type === "URL_PREFIX" &&
      normalizeUrl(property.property_url) === normalizedPrefix,
  );

  if (existing?.property_status === 1) {
    log.info("TikTok Business URL prefix already verified", {
      businessId: client.identity.businessId,
      urlPrefix,
    });
    return { keyPrefix, urlPrefix };
  }

  let signature = existing?.signature;
  let fileName = existing?.file_name;

  try {
    const addResult = await client.addUrlProperty({
      propertyType: "URL_PREFIX",
      propertyUrl: normalizedPrefix,
    });
    signature = addResult.signature;
    fileName = addResult.fileName ?? `${client.identity.businessId}.txt`;
  } catch (error) {
    log.warn("Failed to add TikTok Business URL prefix, reusing existing", {
      businessId: client.identity.businessId,
      urlPrefix,
      error: (error as Error).message,
    });
  }

  if (!signature) {
    throw new WorkflowError(
      `Unable to determine verification signature for TikTok Business prefix ${urlPrefix}`,
    );
  }

  const verificationFileName = fileName ?? `${client.identity.businessId}.txt`;

  await uploadVerificationFile(keyPrefix, verificationFileName, signature);

  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const verification = await client.checkUrlProperty({
      propertyType: "URL_PREFIX",
      propertyUrl: normalizedPrefix,
    });

    log.info("TikTok Business URL prefix verification status", {
      businessId: client.identity.businessId,
      urlPrefix,
      propertyStatus: verification.property_status,
      attempt,
    });

    if (verification.property_status === 1) {
      return { keyPrefix, urlPrefix: normalizedPrefix };
    }

    await delay(Math.min(2000 * attempt, 5000));
  }

  throw new WorkflowError(
    `Failed to verify TikTok Business URL prefix for ${client.identity.businessId}`,
  );
}
