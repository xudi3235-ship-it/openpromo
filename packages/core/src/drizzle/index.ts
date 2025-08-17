import { drizzle } from "drizzle-orm/neon-serverless";
import { Resource } from "sst";
import { Log } from "../util/log";

export * from "drizzle-orm";

const log = Log.create({ namespace: "drizzle" });

export const db = (urlOverride?: string) => {
  // for cf workers, they provide a url override through hyperdrive
  // other services will use the pooled conn from neon.
  const connectionString =
    urlOverride ||
    `postgresql://${Resource.Database.username}:${Resource.Database.password}@${Resource.Database.host}/${Resource.Database.database}`;

  return drizzle({
    connection: connectionString,
    casing: "snake_case",
    logger:
      process.env.DRIZZLE_LOG === "true"
        ? {
            logQuery(query, params) {
              log.info("query", { query });
              log.info("params", { params });
            },
          }
        : undefined,
  });
};
