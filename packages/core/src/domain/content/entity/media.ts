import { Ent } from "@core/helpers/ent";
import { ImageStorage } from "@core/helpers/storage/image";

export class EntImage extends Ent<{ id: string }> {
  constructor(public id: string) {
    super({ id });
  }
  async delete() {
    await ImageStorage.deleteImage(this.id);
  }
  async edit(params: ImageStorage.EditImageParams) {
    return await ImageStorage.edit(this.id, params);
  }
  async getDeliveryUrl(variantName: string = "public") {
    return await ImageStorage.getImageDeliveryUrl(this.id, variantName);
  }
  static async listByWorkspace(
    workspaceID: string,
    continuation_token?: string,
  ) {
    // list images not used in any contents or passed TTL
    const imgs = await ImageStorage.list({
      creator: workspaceID,
      per_page: 1000,
      continuation_token,
    });
    return imgs;
  }
}

export class EntVideo {
  constructor(public id: string) {}
}
