import { DurableObject } from "cloudflare:workers";
import type { Bindings } from ".";

export class Scheduler extends DurableObject<Bindings> {
  constructor(ctx: DurableObjectState, env: Bindings) {
    super(ctx, env);
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
  async alarm() {
    console.log("Alarm triggered!");
    // do some periodic tasks here.
  }
}
