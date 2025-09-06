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

export type AwsOptions = Exclude<
  Parameters<AwsClient["fetch"]>[1],
  null | undefined
>["aws"];
