import { env } from "@core/utils/env";
import { GoogleGenAI } from "@google/genai";

export function getGeminiClient() {
  return new GoogleGenAI({
    apiKey: env.GEMINI_API_KEY,
  });
}
