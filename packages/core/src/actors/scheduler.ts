import { DurableObject } from "cloudflare:workers";
import { Alarms } from "@cloudflare/actors/alarms";
import { Storage } from "@cloudflare/actors/storage";
import type { Bindings } from ".";

export class Scheduler extends DurableObject<Bindings> {
  storage: Storage;
  alarms: Alarms<this>;
  constructor(ctx: DurableObjectState, env: Bindings) {
    super(ctx, env);
    this.storage = new Storage(ctx.storage);
    this.alarms = new Alarms(ctx, this);
  }
  async sayHello(): Promise<string> {
    const result = this.ctx.storage.sql
      .exec("SELECT 'hello from Durable Object!' as greeting")
      .one();
    return result.greeting as string;
  }
  async schedule(): Promise<string> {
    this.ctx.storage.setAlarm(Date.now() + 3 * 1000); // 3 seconds from now
    return "scheduled";
  }
  async alarm(alarmInfo?: AlarmInvocationInfo) {
    // use actor's multi-alarm
    if (this.alarms) {
      await this.alarms.alarm(alarmInfo);
    }
  }
}
