import { ConnectedAccount } from "@core/domain/connected-account/connected-account";
import { Actor } from "@core/helpers/actor";
import { Binding } from "@core/helpers/api-env";
import { db } from "@core/helpers/db";
import {
  pendingContentGroupTable,
  UnifiedContentInsert,
  type UnifiedContentSelect,
  unifiedContentTable,
} from "@core/schemas/content.sql";
import { fn } from "@core/utils/fn";
import { FBFeedPlacementSpec } from "../schema/placement";
import { EntUnifiedContentBase } from "./base";

export class EntPendingContent extends EntUnifiedContentBase {
  protected deleteSrc(): Promise<void> {
    // noop.
    return Promise.resolve();
  }
  override isPublished(): boolean {
    return false; // not possible
  }
  static async fromID(id: string): Promise<EntPendingContent> {
    return new EntPendingContent(await EntUnifiedContentBase._fromID(id));
  }
  override fromUnifiedContent(
    data: UnifiedContentSelect,
  ): EntUnifiedContentBase {
    return new EntPendingContent(data);
  }
  async toScheduledContent(): Promise<
    import("./scheduled-content").EntScheduledContent
  > {
    // Import moved to separate file to avoid circular dependency
    // Using dynamic import to avoid circular dependency at module level
    const { EntScheduledContent } = await import("./scheduled-content");
    return new EntScheduledContent(this.data);
  }
  static createManyInternal = fn(
    UnifiedContentInsert.omit({ workspaceId: true }).array(),
    async (items) => {
      return items.map((i) => EntPendingContent.createInternal(i));
    },
  );
  static createInternal = fn(
    UnifiedContentInsert.omit({ workspaceId: true }),
    async ({
      placementSpec,
      publishingStatus,
      pendingContentGroupId,
      connectedAccountId,
    }) => {
      const actor = Actor.assert("workspace_user");
      if (!placementSpec) throw new Error("Invalid placementSpec");
      // 1. insert record
      const [c] = await db()
        .insert(unifiedContentTable)
        .values({
          placement: placementSpec.placement,
          workspaceId: actor.properties.workspaceID,
          connectedAccountId: connectedAccountId,
          placementSpec: placementSpec,
          pendingContentGroupId,
          publishingStatus,
        })
        .returning();
      // 2. kickoff workflow
      const { WORKFLOW } = Binding.use();
      try {
        // TODO: better tenant based ID?
        const wf = await WORKFLOW.create({
          id: `${c.id}`,
          params: {
            actor,
            pendingContentID: c.id,
          },
        });
        return { c, wf };
      } catch (e) {
        console.error("workflow already exists", e);
        throw e;
      }
    },
  );
  static async _createDummy(pageID?: string): Promise<EntPendingContent> {
    const acc = await ConnectedAccount._createDummy();
    const content = await EntPendingContent.create({
      placement: "FB_FEED",
      connectedAccountId: acc.id,
      publishingStatus: "SCHEDULED",
      placementSpec: {
        identity: {
          pageId: pageID ?? acc.externalAccountId,
          userId: "dummy_user_id",
        },
        placement: "FB_FEED",
        postSpec: {
          message: "trust me bro - from openpromo",
          attachments: [
            {
              type: "photo",
              id: "your_mom",
            },
            {
              type: "video",
              id: "your_mom_again",
            },
          ],
        },
      },
      schedulingSpec: {
        scheduledPublishAt: new Date(Date.now() + 5 * 1000), // 5 seconds later
      },
    });
    // create a pending group that backs it
    await db()
      .insert(pendingContentGroupTable)
      .values({
        publishingStatus: "SCHEDULED",
        workspaceId: Actor.workspaceID(),
      })
      .returning();
    return new EntPendingContent(content);
  }
  facebookFeedPlacementSpec(): FBFeedPlacementSpec {
    const p = this.placement();
    if (p !== "FB_FEED") {
      throw new Error(`Content ${this.data.id} is not FB_FEED placement`);
    }
    const {
      data: spec,
      success,
      error,
    } = FBFeedPlacementSpec.safeParse(this.data.placementSpec);
    if (!spec || !success || error) {
      throw new Error(`Invalid placementSpec for content ${this.data.id}`);
    }
    return spec;
  }
}
