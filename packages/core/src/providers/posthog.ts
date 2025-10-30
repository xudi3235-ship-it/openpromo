import { env } from "@core/utils/env";
import { PostHog } from "posthog-node";

export const getPostHogClient = () => {
  const posthog = new PostHog(env.VITE_PUBLIC_POSTHOG_KEY, {
    host: env.VITE_PUBLIC_POSTHOG_HOST,
  });
  return posthog;
};
