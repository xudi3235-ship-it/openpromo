import type { Draft } from "immer";
import type { ComposerStore } from "../types";

export type ComposerSlice<T extends Partial<ComposerStore>> = (
  set: (updater: (state: Draft<ComposerStore>) => void) => void,
  get: () => ComposerStore,
) => T;
