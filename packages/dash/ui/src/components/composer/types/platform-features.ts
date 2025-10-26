/**
 * Platform-specific feature types for composer UI
 */

import type { FBFeedPlacementSpec } from "@shared/content";

/**
 * Facebook CTA button types
 * ref: https://developers.facebook.com/docs/graph-api/reference/page/feed#page-post-call_to_action
 */
export type CTAType = NonNullable<
  FBFeedPlacementSpec["postSpec"]["callToAction"]
>["type"];

export const CTA_OPTIONS: Array<{
  value: CTAType;
  label: string;
  description: string;
}> = [
  {
    value: "SHOP_NOW",
    label: "Shop Now",
    description: "Direct customers to your online store",
  },
  {
    value: "LEARN_MORE",
    label: "Learn More",
    description: "Share more information about your business",
  },
  {
    value: "CALL_NOW",
    label: "Call Now",
    description: "Encourage customers to call your business",
  },
  {
    value: "BOOK_NOW",
    label: "Book Now",
    description: "Let customers schedule appointments",
  },
  {
    value: "SIGN_UP",
    label: "Sign Up",
    description: "Grow your email list or memberships",
  },
  {
    value: "CONTACT_US",
    label: "Contact Us",
    description: "Make it easy for customers to reach you",
  },
  {
    value: "GET_QUOTE",
    label: "Get Quote",
    description: "Generate leads for your services",
  },
];
