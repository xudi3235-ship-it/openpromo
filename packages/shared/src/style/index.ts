import z from "zod";

export const StyleState = [
  "not_started",
  "pending",
  "processing",
  "ready",
  "failed",
] as const;

export type StyleState = (typeof StyleState)[number];

export const StyleStateZod = z.enum(StyleState);
