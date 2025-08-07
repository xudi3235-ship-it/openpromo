import { json, mysqlTable, primaryKey, varchar } from "drizzle-orm/mysql-core";
import { z } from "zod";
import { id, timestamps, ulid } from "../drizzle/types";

export const UserFlags = z.object({
  printer: z.boolean().optional(),
});

export type UserFlags = z.infer<typeof UserFlags>;

// creates user ID for tables
export const userID = {
  get id() {
    return ulid("id").notNull();
  },
  get userID() {
    return ulid("user_id")
      .notNull()
      .references(() => userTable.id, {
        onDelete: "cascade",
      });
  },
};

export const userTable = mysqlTable(
  "user",
  {
    ...id,
    ...timestamps,
    name: varchar("name", { length: 255 }),
    email: varchar("email", { length: 255 }).notNull().unique(),
    stripeCustomerID: varchar("stripe_customer_id", { length: 255 })
      .unique()
      .notNull(),
    emailOctopusID: varchar("email_octopus_id", { length: 255 })
      .unique()
      .notNull(),
    flags: json("flags").$type<UserFlags>().default({}),
  },
  (t) => [primaryKey({ columns: [t.id] })],
);
