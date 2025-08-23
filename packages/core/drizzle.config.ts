import { defineConfig } from "drizzle-kit";
import { Resource } from "sst";

export default defineConfig({
  strict: true,
  out: "./migrations",
  dialect: "postgresql",
  schema: "./src/schema/*.sql.ts",
  casing: "snake_case",
  dbCredentials: {
    url: `postgresql://${Resource.Database.username}:${Resource.Database.password}@${Resource.Database.host}/${Resource.Database.database}?sslmode=require`,
  },
});
