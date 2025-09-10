import type {
  UnifiedContentFacebookPost,
  UnifiedContentInstagramPost,
  UnifiedContentSelect,
} from "@core/schemas/content.sql";
import { NotImplementedError } from "@core/utils/error";
import { EntUnifiedContentBase } from "./base";

/**
 * app-level entity for Facebook posts. Internally it uses the unified content
 * entity. We wrap it this way to provide platform specific operations.
 */
export class EntFacebookPost extends EntUnifiedContentBase {
  toJSON(): UnifiedContentFacebookPost {
    return this.data as UnifiedContentFacebookPost;
  }
  override fromUnifiedContent(data: UnifiedContentSelect): EntFacebookPost {
    return new EntFacebookPost(data);
  }

  public async fromUnifiedContentID(id: string): Promise<EntFacebookPost> {
    return new EntFacebookPost(await EntUnifiedContentBase._fromID(id));
  }
  protected async deleteSrc(): Promise<void> {
    throw new NotImplementedError("Facebook post deletion not yet implemented");
  }

  public async _delete(): Promise<UnifiedContentFacebookPost> {
    return (await super._delete()) as UnifiedContentFacebookPost;
  }
}

export class EntInstagramPost extends EntUnifiedContentBase {
  toJSON(): UnifiedContentInstagramPost {
    return this.data as UnifiedContentInstagramPost;
  }
  override fromUnifiedContent(data: UnifiedContentSelect): EntInstagramPost {
    return new EntInstagramPost(data);
  }

  async fromUnifiedContentID(id: string): Promise<EntInstagramPost> {
    return new EntInstagramPost(await EntUnifiedContentBase._fromID(id));
  }
  protected async deleteSrc(): Promise<void> {
    throw new NotImplementedError(
      "Instagram post deletion not yet implemented",
    );
  }

  public async _delete(): Promise<UnifiedContentInstagramPost> {
    return (await super._delete()) as UnifiedContentInstagramPost;
  }
}
