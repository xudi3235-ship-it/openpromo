import { id, timestamps } from "@core/helpers/db";
import { pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { platformPgEnum } from "./connected-account.sql";

export const inboxContactsTable = pgTable(
  "inbox_contacts",
  {
    ...id,
    ...timestamps,
    platform: platformPgEnum().notNull(),
    externalId: text().notNull(), // external id from the platform
    name: text().notNull(),
    profilePicUrl: text().notNull(),
  },
  (t) => [uniqueIndex().on(t.platform, t.externalId)],
);
