import { spawnSync } from "node:child_process";
import { Resource } from "sst";

const args = [
  "-h",
  Resource.Database.host,
  "-u",
  Resource.Database.username,
  "--password=" + Resource.Database.password,
  Resource.Database.database,
];
spawnSync("mysql", args, {
  stdio: "inherit",
});
