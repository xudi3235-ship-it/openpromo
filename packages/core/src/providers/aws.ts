import { env } from "@core/utils/env";
import { AwsClient } from "aws4fetch";

export const DEFAULT_AWS_REGION = "us-east-1";

export function getAwsConfig(): AwsOptions {
  return {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || DEFAULT_AWS_REGION,
  };
}

export async function getAwsClient(): Promise<AwsClient> {
  if (
    process.env.AWS_ACCESS_KEY_ID?.trim() &&
    process.env.AWS_SECRET_ACCESS_KEY?.trim()
  ) {
    return new AwsClient({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN,
      region: process.env.AWS_REGION || DEFAULT_AWS_REGION,
    });
  }
  throw new Error("No AWS credentials found");
}

export function getR2Client(): { client: AwsClient; r2Url: string } {
  const r2Url = `https://${env.CLOUDFLARE_DEFAULT_ACCOUNT_ID}.r2.cloudflarestorage.com`;

  const client = new AwsClient({
    accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    region: "auto",
    service: "s3",
  });

  return { client, r2Url };
}

export type AwsOptions = Exclude<
  Parameters<AwsClient["fetch"]>[1],
  null | undefined
>["aws"];
