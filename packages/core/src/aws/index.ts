import type { AwsOptions } from "sst/aws/client";

export function getAwsConfig(): AwsOptions {
  return {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || "us-east-1",
  };
}
