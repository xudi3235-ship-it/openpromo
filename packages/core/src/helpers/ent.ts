export type Constructor<T, Def extends unknown[] = unknown[]> = new (
  ...args: Def
) => T;

export abstract class Ent<TData extends Rpc.Serializable<TData>> {
  static type: string;

  constructor(protected data: TData) {}

  serialize(): { type: string; data: TData } {
    return { type: (this.constructor as typeof Ent).type, data: this.data };
  }

  deserialize(obj: { type: string; data: TData }): Ent<TData> {
    if (obj.type !== (this.constructor as typeof Ent).type) {
      throw new Error(
        `Type mismatch: expected ${(this.constructor as typeof Ent).type}, got ${obj.type}`,
      );
    }
    return new (this.constructor as Constructor<Ent<TData>>)(obj.data);
  }
}
