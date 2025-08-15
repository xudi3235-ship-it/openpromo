import { ulid } from "ulid";

export const prefixes = {
  user: "usr",
  subscription: "sub",
  organization: "org",
  workspace: "wrk",
  user_workspace: "uwrk",
  content_group: "cgr",
  unified_content: "unc",
  connected_account: "cac",
} as const;

export function createID(prefix: keyof typeof prefixes): string {
  return [prefixes[prefix], ulid()].join("_");
}
