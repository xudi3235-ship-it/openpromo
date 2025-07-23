import {
  json,
  mysqlTable,
  primaryKey,
  text,
  varchar,
} from "drizzle-orm/mysql-core";
import { id, ulid, timestamps } from "../drizzle/types";
import { z } from "zod";

export const UserFlags = z.object({
  printer: z.boolean().optional(),
});

export type UserFlags = z.infer<typeof UserFlags>;

export const userTable = mysqlTable("user", {
  ...id,
  ...timestamps,
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  stripeCustomerID: varchar("stripe_customer_id", { length: 255 })
    .unique()
    .notNull(),
  emailOctopusID: text("email_octopus_id"),
  flags: json("flags").$type<UserFlags>().default({}),
});
