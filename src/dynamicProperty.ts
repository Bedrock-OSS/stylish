import { world } from "@minecraft/server";

interface CacheEntry {
  value: unknown;
}

// One cache entry per property id. World dynamic properties are global, so
// the cache is shared across all fields/instances bound to the same id.
const cache = new Map<string, CacheEntry>();

export interface WorldPropertyOptions {
  /**
   * Serialize the value with JSON so arbitrary objects/arrays can be stored.
   * Without this, values must be natively supported dynamic property types
   * (boolean, number, string, Vector3).
   */
  json?: boolean;
}

/**
 * Property decorator - backs the field with a world dynamic property.
 *
 * Reads hit the native `world.getDynamicProperty` once and are served from a
 * JS cache afterwards; writes update the cache and write through natively.
 *
 * Declare the field without an initializer (a class-field initializer would
 * overwrite the persisted value on every construction) and pass the default
 * to the decorator instead:
 *
 * ```ts
 * class Config {
 *   @WorldProperty("wiki:difficulty", 1)
 *   difficulty!: number;
 * }
 * ```
 *
 * Note: dynamic properties are unavailable in early execution, so don't read
 * or write the field before startup. Requires `useDefineForClassFields: false`
 * in tsconfig (the default alongside `experimentalDecorators`).
 */
export function WorldProperty<T>(
  id: string,
  defaultValue?: T,
  options?: WorldPropertyOptions
) {
  const json = options?.json === true;
  return function (target: any, propertyKey: string | symbol): void {
    Object.defineProperty(target, propertyKey, {
      configurable: true,
      enumerable: false,
      get(): T | undefined {
        let entry = cache.get(id);
        if (!entry) {
          const raw = world.getDynamicProperty(id);
          let value: unknown;
          if (raw === undefined) {
            value = defaultValue;
          } else if (json && typeof raw === "string") {
            try {
              value = JSON.parse(raw);
            } catch {
              value = defaultValue;
            }
          } else {
            value = raw;
          }
          entry = { value };
          cache.set(id, entry);
        }
        return entry.value as T | undefined;
      },
      set(v: T) {
        cache.set(id, { value: v });
        world.setDynamicProperty(id, json ? JSON.stringify(v) : (v as any));
      },
    });
  };
}

/**
 * Drops the in-memory cache for one property id (or all when omitted), so the
 * next read goes back to `world.getDynamicProperty`. Use when the underlying
 * dynamic property is modified outside the decorated field.
 */
export function invalidateWorldProperty(id?: string) {
  if (id === undefined) cache.clear();
  else cache.delete(id);
}
