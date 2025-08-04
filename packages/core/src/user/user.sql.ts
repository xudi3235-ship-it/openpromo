import {
  json,
  mysqlTable,
  primaryKey,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { z } from "zod";
import { timestamps } from "../drizzle/types";
import { workspaceID } from "../workspace/workspace.sql";

export const UserFlags = z.object({
  printer: z.boolean().optional(),
});

export type UserFlags = z.infer<typeof UserFlags>;

export const userTable = mysqlTable(
  "user",
  {
    ...workspaceID,
    ...timestamps,
    name: varchar("name", { length: 255 }),
    email: varchar("email", { length: 255 }).notNull(),
    stripeCustomerID: varchar("stripe_customer_id", { length: 255 })
      .unique()
      .notNull(),
    emailOctopusID: text("email_octopus_id"),
    flags: json("flags").$type<UserFlags>().default({}),
  },
  (t) => [
    primaryKey({ columns: [t.workspaceID, t.id] }),
    uniqueIndex("email").on(t.workspaceID, t.email),
  ],
);
