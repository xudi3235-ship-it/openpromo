import { defineConfig } from "drizzle-kit";
import { env } from "./src/utils/env";

export default defineConfig({
  strict: true,
  out: "./migrations",
  dialect: "postgresql",
  schema: "./src/schemas/*.sql.ts",
  casing: "snake_case",
  dbCredentials: {
    url: env.DATABASE_URL,
    // url: `postgresql://${Resource.Database.username}:${Resource.Database.password}@${Resource.Database.host}/${Resource.Database.database}?sslmode=require`,
  },
});
