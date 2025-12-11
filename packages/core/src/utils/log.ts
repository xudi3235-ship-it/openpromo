/** biome-ignore-all lint/suspicious/noExplicitAny: lib */
import { createContext } from "./context";

export namespace Log {
  const ctx = createContext<{
    tags: Record<string, any>;
  }>();

  export function create(tags?: Record<string, any>) {
    tags = tags || {};

    const result = {
      info(...args: any[]) {
        const prefix = Object.entries({
          ...use().tags,
          ...tags,
        })
          .map(([key, value]) => `${key}=${value}`)
          .join(" ");

        if (prefix) {
          console.log(prefix, ...args);
        } else {
          console.log(...args);
        }
        return result;
      },
      warn(...args: any[]) {
        const prefix = Object.entries({
          ...use().tags,
          ...tags,
        })
          .map(([key, value]) => `${key}=${value}`)
          .join(" ");

        if (prefix) {
          console.warn(prefix, ...args);
        } else {
          console.warn(...args);
        }
        return result;
      },
      error(...args: any[]) {
        const prefix = Object.entries({
          ...use().tags,
          ...tags,
        })
          .map(([key, value]) => `${key}=${value}`)
          .join(" ");

        if (prefix) {
          console.error(prefix, ...args);
        } else {
          console.error(...args);
        }
        return result;
      },
      tag(key: string, value: string) {
        tags[key] = value;
        return result;
      },
      clone() {
        return Log.create({ ...tags });
      },
    };

    return result;
  }

  export function provide<R>(tags: Record<string, any>, cb: () => R) {
    const existing = use();
    return ctx.provide(
      {
        tags: {
          ...existing.tags,
          ...tags,
        },
      },
      cb,
    );
  }

  function use() {
    try {
      return ctx.use();
    } catch (_e) {
      return { tags: {} };
    }
  }
}
