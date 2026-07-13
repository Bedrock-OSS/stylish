/* eslint-disable @typescript-eslint/no-var-requires */
import { jest } from "@jest/globals";

beforeEach(() => {
  jest.resetModules();
});

describe("registerAllComponents", () => {
  test("delegates to item and block registries", () => {
    jest.isolateModules(() => {
      const mockItems = jest.fn();
      const mockBlocks = jest.fn();
      jest.doMock("../src/itemRegistry", () => ({
        registerAllItemComponents: mockItems,
      }));
      jest.doMock("../src/blockRegistry", () => ({
        registerAllBlockComponents: mockBlocks,
      }));

      const { registerAllComponents } = require("../src/index");
      const item = {} as any;
      const block = {} as any;
      registerAllComponents(item, block);
      expect(mockItems).toHaveBeenCalledWith(item);
      expect(mockBlocks).toHaveBeenCalledWith(block);
    });
  });
});

describe("init", () => {
  test("subscribes to startup, registers components, and triggers events", () => {
    jest.isolateModules(() => {
      const startupEvent = {
        itemComponentRegistry: "i",
        blockComponentRegistry: "b",
      } as any;

      const startupSubscribe = jest.fn((cb: any) => cb(startupEvent));

      const mc = require("@minecraft/server");
      mc.system.beforeEvents = { startup: { subscribe: startupSubscribe } } as any;

      const mockItems = jest.fn();
      const mockBlocks = jest.fn();
      const mockTriggerStartup = jest.fn();

      jest.doMock("../src/itemRegistry", () => ({
        registerAllItemComponents: mockItems,
        itemComponentCount: () => 1,
      }));
      jest.doMock("../src/blockRegistry", () => ({
        registerAllBlockComponents: mockBlocks,
        blockComponentCount: () => 1,
      }));
      jest.doMock("../src/eventRegistry", () => ({
        triggerStartupEvent: mockTriggerStartup,
        OnStartup: jest.fn(),
        OnBeforeItemUse: jest.fn(),
        OnWorldLoad: jest.fn(),
        RegisterEvents: jest.fn(),
        createEventDecorator: jest.fn(),
      }));

      const index = require("../src/index");
      index.init();

      expect(startupSubscribe).toHaveBeenCalled();
      expect(mockItems).toHaveBeenCalledWith("i");
      expect(mockBlocks).toHaveBeenCalledWith("b");
      expect(mockTriggerStartup).toHaveBeenCalledWith(startupEvent);
    });
  });

  test("skips native registry accessors when nothing is registered", () => {
    jest.isolateModules(() => {
      let itemAccessed = false;
      let blockAccessed = false;
      let commandAccessed = false;
      const startupEvent = {} as any;
      Object.defineProperty(startupEvent, "itemComponentRegistry", {
        get() { itemAccessed = true; return "i"; },
      });
      Object.defineProperty(startupEvent, "blockComponentRegistry", {
        get() { blockAccessed = true; return "b"; },
      });
      Object.defineProperty(startupEvent, "customCommandRegistry", {
        get() { commandAccessed = true; return "c"; },
      });

      const mc = require("@minecraft/server");
      mc.system.beforeEvents = {
        startup: { subscribe: jest.fn((cb: any) => cb(startupEvent)) },
      } as any;
      mc.world.afterEvents = {} as any;
      mc.world.beforeEvents = {} as any;

      // Override the doMock factories left registered by the previous test
      jest.doMock("../src/itemRegistry", () => ({
        registerAllItemComponents: jest.fn(),
        itemComponentCount: () => 0,
      }));
      jest.doMock("../src/blockRegistry", () => ({
        registerAllBlockComponents: jest.fn(),
        blockComponentCount: () => 0,
      }));
      jest.doMock("../src/customCommandRegistry", () => ({
        registerAllCustomCommands: jest.fn(),
        customCommandCount: () => 0,
      }));

      const index = require("../src/index");
      index.init();

      expect(itemAccessed).toBe(false);
      expect(blockAccessed).toBe(false);
      expect(commandAccessed).toBe(false);
    });
  });
});
