import type { UnifiedContentSelect } from "@core/schemas/content.sql";
import { nullThrows } from "@openpromo/js-shared/common";
import { EntPendingContent } from "./pending-content";

export class EntScheduledContent extends EntPendingContent {
  constructor(data: UnifiedContentSelect) {
    super(data);
    if (!this.isScheduled()) {
      throw new Error(`Content ${data.id} is not scheduled`);
    }
    const spec = this.data.schedulingSpec;
    if (!spec?.scheduledPublishAt) {
      throw new Error(`Content ${this.data.id} missing schedulingSpec`);
    }
  }
  public getScheduledAt(): Date {
    const spec = nullThrows(this.data.schedulingSpec);
    return spec.scheduledPublishAt;
  }
}
