import { Actor } from "./actor";

export namespace FeatureFlag {
  export function isEnabled(flag: string): boolean {
    const actor = Actor.assert("workspace_user");
    console.log("feature flags in FeatureFlag:", actor.properties.featureFlags);
    return actor.properties.featureFlags.includes(flag);
  }
  export function isInternal() {
    return isEnabled("is_internal");
  }
}
