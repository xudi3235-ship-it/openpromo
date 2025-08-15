import { gunzipSync, gzipSync } from "node:zlib";
import { sql } from "drizzle-orm";
import {
  bigint,
  char,
  customType,
  timestamp as rawTs,
} from "drizzle-orm/pg-core";

export const ulid = (name: string) => char(name, { length: 26 + 4 });

export const id = {
  get id() {
    return ulid("id").primaryKey();
  },
};

export const timestamp = (name: string) =>
  rawTs(name, {
    precision: 3,
    mode: "date",
  });

export const dollar = (name: string) =>
  bigint(name, {
    mode: "number",
  });

export const timestamps = {
  timeCreated: timestamp("time_created").notNull().defaultNow(),
  timeUpdated: timestamp("time_updated")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`),
  timeDeleted: timestamp("time_deleted"),
};

export const blob = <TData>(name: string) =>
  customType<{ data: TData; driverData: string }>({
    dataType() {
      return "longtext";
    },
    fromDriver(value) {
      return JSON.parse(gunzipSync(Buffer.from(value, "binary")).toString());
    },
    toDriver(value: TData) {
      return gzipSync(Buffer.from(JSON.stringify(value))).toString("binary");
    },
  })(name);
