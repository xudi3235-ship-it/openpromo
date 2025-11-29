import { env } from "@core/utils/env";
import OpenAI from "openai";

export function oai(): OpenAI {
  const client = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
  });
  return client;
}
