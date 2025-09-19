import type { ApiEnv } from "./helpers/api-env";
import { ImageStorage } from "./helpers/storage/image";

// entrypoint for worker's cron jobs
export async function scheduledHandler(
  controller: ScheduledController,
  _env: ApiEnv["Bindings"],
  _ctx: ExecutionContext,
) {
  switch (controller.cron) {
    // daily
    case "0 0 * * *":
      await dailyJob();
      break;
    default:
      break;
  }
  console.log("cron processed");
}

async function dailyJob() {
  await ImageStorage.batchDeleteImages();

  console.log("daily task executed");
}
