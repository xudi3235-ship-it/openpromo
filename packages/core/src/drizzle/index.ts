import { Client } from "@planetscale/database";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Resource } from "sst";
import { Log } from "../util/log";

export * from "drizzle-orm";

const log = Log.create({ namespace: "drizzle" });

export const db = () => {
  const client = new Client({
    host: Resource.Database.host,
    username: Resource.Database.username,
    password: Resource.Database.password,
  });
  return drizzle(client, {
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
