export type Constructor<T, Def extends unknown[] = unknown[]> = new (
  ...args: Def
) => T;

export abstract class Ent<TData extends Rpc.Serializable<TData>> {
  static type: string;

  constructor(protected data: TData) {}

  serialize(): { type: string; data: TData } {
    return { type: (this.constructor as typeof Ent).type, data: this.data };
  }
}

export function deserializeEnt<
  TEnt extends Ent<TData>,
  TData extends Rpc.Serializable<TData>,
>(entClass: Constructor<TEnt>, obj: { type: string; data: TData }): TEnt {
  if (obj.type !== (entClass as unknown as typeof Ent).type) {
    throw new Error(
      `Type mismatch: expected ${(entClass as unknown as typeof Ent).type}, got ${obj.type}`,
    );
  }
  return new (entClass as Constructor<TEnt>)(obj.data);
}
