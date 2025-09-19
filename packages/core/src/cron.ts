import type { ApiEnv } from "./helpers/api-env";
import { ImageStorage } from "./helpers/storage/image";
import { VideoStorage } from "./helpers/storage/video";

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
  await VideoStorage.batchDeleteVideos();

  console.log("daily task executed");
}
