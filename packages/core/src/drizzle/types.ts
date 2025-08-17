import { char, timestamp as rawTs } from "drizzle-orm/pg-core";
import { ulid as generateULID } from "ulid";

export const ulid = () => char({ length: 26 }).$defaultFn(() => generateULID());

export const timestamp = () => rawTs({ withTimezone: true, mode: "date" });

export const timestamps = {
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp()
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// export const dollar = (name: string) =>
//   bigint(name, {
//     mode: "number",
//   });

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
