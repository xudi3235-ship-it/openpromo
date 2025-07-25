import {
  mysqlTable,
  primaryKey,
  date,
  uniqueIndex,
  mysqlEnum,
  bigint,
  varchar,
  timestamp,
} from "drizzle-orm/mysql-core";
import { timestamps } from "../drizzle/types";
import { workspaceID } from "../workspace/workspace.sql";
import type Stripe from "stripe";
import { z } from "zod";

type SubscriptionStatus = Stripe.Subscription.Status;
export const StripeSubscriptionStatus = [
  "active",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "past_due",
  "paused",
  "trialing",
  "unpaid",
] as const;

export const subscriptionTable = mysqlTable(
  "subscription",
  {
    ...workspaceID,
    ...timestamps,
    customerID: varchar("customer_id", { length: 255 }),
    subscriptionID: varchar("subscription_id", { length: 255 }),
    subscriptionItemID: varchar("subscription_item_id", {
      length: 255,
    }),
    status: mysqlEnum("status", [...StripeSubscriptionStatus]).notNull(),
    priceID: varchar("price_id", { length: 255 }),
    couponID: varchar("coupon_id", { length: 255 }),
    timeTrialEnded: timestamp("time_trial_ended", { mode: "string" }),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceID, table.id] }),
    uniqueIndex("workspaceID").on(table.workspaceID),
  ],
);
