import type { UnifiedContentSelect } from "@core/schemas/content.sql";
import { nullThrows } from "@core/utils/common";
import { EntPendingContent } from "./pending-content";

export class EntScheduledContent extends EntPendingContent {
  constructor(data: UnifiedContentSelect) {
    super(data);
    if (!this.isScheduled()) {
      throw new Error(`Content ${data.id} is not scheduled`);
    }
    const spec = this.data.placementSpec?.schedulingSpec;
    if (!spec?.publishAt) {
      throw new Error(`Content ${this.data.id} missing schedulingSpec`);
    }
  }
  public getScheduledAt(): Date {
    const d = nullThrows(this.data.placementSpec?.schedulingSpec?.publishAt);
    return new Date(d);
  }
}
