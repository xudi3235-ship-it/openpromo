import { sql } from "drizzle-orm";
import { customType, timestamp as rawTs } from "drizzle-orm/pg-core";

export const ulid = customType<{ data: string }>({
  dataType() {
    return "ulid";
  },
});

export const id = {
  get id() {
    return ulid("id").primaryKey().default(sql`gen_ulid()`);
  },
};

export const timestamp = () => rawTs({ withTimezone: true, mode: "date" });

export const timestamps = {
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp()
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// export const blob = <TData>(name: string) =>
//   customType<{ data: TData; driverData: string }>({
//     dataType() {
//       return "longtext";
//     },
//     fromDriver(value) {
//       return JSON.parse(gunzipSync(Buffer.from(value, "binary")).toString());
//     },
//     toDriver(value: TData) {
//       return gzipSync(Buffer.from(JSON.stringify(value))).toString("binary");
//     },
//   })(name);
