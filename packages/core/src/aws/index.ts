import type { AwsOptions } from "./client";

export const DEFAULT_AWS_REGION = "us-east-1";
export function getAwsConfig(): AwsOptions {
  return {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || DEFAULT_AWS_REGION,
  };
}
