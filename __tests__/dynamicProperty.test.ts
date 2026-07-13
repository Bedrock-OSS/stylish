/* eslint-disable @typescript-eslint/no-var-requires */
import { jest } from "@jest/globals";

beforeEach(() => {
  jest.resetModules();
});

function setupWorldStore() {
  const store = new Map<string, unknown>();
  const mc = require("@minecraft/server");
  mc.world.getDynamicProperty = jest.fn((id: string) => store.get(id));
  mc.world.setDynamicProperty = jest.fn((id: string, v: unknown) =>
    store.set(id, v)
  );
  return { mc, store };
}

describe("WorldProperty", () => {
  test("reads native once, serves from cache, writes through", () => {
    jest.isolateModules(() => {
      const { mc, store } = setupWorldStore();
      const { WorldProperty } = require("../src/dynamicProperty");

      class Config {
        declare difficulty: number;
      }
      WorldProperty("test:difficulty", 1)(Config.prototype, "difficulty");
      const config = new Config();

      // default when unset; native read happens once
      expect(config.difficulty).toBe(1);
      expect(config.difficulty).toBe(1);
      expect(mc.world.getDynamicProperty).toHaveBeenCalledTimes(1);

      // write-through
      config.difficulty = 3;
      expect(store.get("test:difficulty")).toBe(3);
      expect(config.difficulty).toBe(3);
      // reads after the write still don't hit native
      expect(mc.world.getDynamicProperty).toHaveBeenCalledTimes(1);
    });
  });

  test("returns the persisted value over the default", () => {
    jest.isolateModules(() => {
      const { store } = setupWorldStore();
      store.set("test:difficulty", 7);
      const { WorldProperty } = require("../src/dynamicProperty");

      class Config {
        declare difficulty: number;
      }
      WorldProperty("test:difficulty", 1)(Config.prototype, "difficulty");
      expect(new Config().difficulty).toBe(7);
    });
  });

  test("instances share the cache for the same property id", () => {
    jest.isolateModules(() => {
      const { mc } = setupWorldStore();
      const { WorldProperty } = require("../src/dynamicProperty");

      class Config {
        declare score: number;
      }
      WorldProperty("test:score", 0)(Config.prototype, "score");
      const a = new Config();
      const b = new Config();

      a.score = 42;
      expect(b.score).toBe(42);
      expect(mc.world.getDynamicProperty).not.toHaveBeenCalled();
    });
  });

  test("json mode serializes objects and parses them back after invalidation", () => {
    jest.isolateModules(() => {
      const { store } = setupWorldStore();
      const {
        WorldProperty,
        invalidateWorldProperty,
      } = require("../src/dynamicProperty");

      class Config {
        declare settings: { volume: number };
      }
      WorldProperty("test:settings", { volume: 1 }, { json: true })(
        Config.prototype,
        "settings"
      );
      const config = new Config();

      config.settings = { volume: 5 };
      expect(store.get("test:settings")).toBe('{"volume":5}');

      invalidateWorldProperty("test:settings");
      expect(config.settings).toEqual({ volume: 5 });
    });
  });

  test("invalidateWorldProperty forces a native re-read", () => {
    jest.isolateModules(() => {
      const { mc, store } = setupWorldStore();
      const {
        WorldProperty,
        invalidateWorldProperty,
      } = require("../src/dynamicProperty");

      class Config {
        declare difficulty: number;
      }
      WorldProperty("test:difficulty", 1)(Config.prototype, "difficulty");
      const config = new Config();

      expect(config.difficulty).toBe(1);
      store.set("test:difficulty", 9); // external write
      expect(config.difficulty).toBe(1); // cached
      invalidateWorldProperty();
      expect(config.difficulty).toBe(9);
      expect(mc.world.getDynamicProperty).toHaveBeenCalledTimes(2);
    });
  });
});
