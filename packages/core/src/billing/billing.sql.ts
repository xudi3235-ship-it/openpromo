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
import { timestamps, workspaceID, ulid } from "../drizzle/types";

export const Standing = ["good", "overdue"] as const;
// TODO: implement this proper usage table
// export const usageTable = mysqlTable(
//   "usage",
//   {
//     workspaceID: workspaceID.workspaceID,
//     ...timestamps,
//     id: ulid("id").notNull(),
//     stageID: ulid("stage_id").notNull(),
//     day: date("day", { mode: "string" }).notNull(),
//     invocations: bigint("invocations", { mode: "number" }).notNull(),
//   },
//   (table) => [
//     primaryKey({ columns: [table.workspaceID, table.id] }),
//     uniqueIndex("stage").on(table.workspaceID, table.stageID, table.day),
//   ],
// );

export const stripeTable = mysqlTable(
  "stripe",
  {
    ...workspaceID,
    ...timestamps,
    customerID: varchar("customer_id", { length: 255 }),
    subscriptionID: varchar("subscription_id", { length: 255 }),
    subscriptionItemID: varchar("subscription_item_id", {
      length: 255,
    }),
    priceID: varchar("price_id", { length: 255 }),
    couponID: varchar("coupon_id", { length: 255 }),
    standing: mysqlEnum("standing", Standing),
    timeTrialEnded: timestamp("time_trial_ended", { mode: "string" }),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceID, table.id] }),
    uniqueIndex("workspaceID").on(table.workspaceID),
  ],
);
