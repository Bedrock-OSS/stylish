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
  test("subscribes to startup/worldLoad, registers components, and triggers events", () => {
    jest.isolateModules(() => {
      const startupEvent = {
        itemComponentRegistry: "i",
        blockComponentRegistry: "b",
      } as any;
      const worldLoadEvent = { foo: "bar" } as any;

      const startupSubscribe = jest.fn((cb: any) => cb(startupEvent));
      const worldLoadSubscribe = jest.fn((cb: any) => cb(worldLoadEvent));

      const mc = require("@minecraft/server");
      mc.system.beforeEvents = { startup: { subscribe: startupSubscribe } } as any;
      mc.world.afterEvents = { worldLoad: { subscribe: worldLoadSubscribe } } as any;

      const mockItems = jest.fn();
      const mockBlocks = jest.fn();
      const mockTriggerStartup = jest.fn();
      const mockTriggerWorldLoad = jest.fn();

      jest.doMock("../src/itemRegistry", () => ({
        registerAllItemComponents: mockItems,
      }));
      jest.doMock("../src/blockRegistry", () => ({
        registerAllBlockComponents: mockBlocks,
      }));
      jest.doMock("../src/eventRegistry", () => ({
        triggerStartupEvent: mockTriggerStartup,
        triggerWorldLoadEvent: mockTriggerWorldLoad,
        OnStartup: jest.fn(),
        OnBeforeItemUse: jest.fn(),
        OnWorldLoad: jest.fn(),
        RegisterEvents: jest.fn(),
        createEventDecorator: jest.fn(),
      }));

      const index = require("../src/index");
      index.init();

      expect(startupSubscribe).toHaveBeenCalled();
      expect(worldLoadSubscribe).toHaveBeenCalled();
      expect(mockItems).toHaveBeenCalledWith("i");
      expect(mockBlocks).toHaveBeenCalledWith("b");
      expect(mockTriggerStartup).toHaveBeenCalledWith(startupEvent);
      expect(mockTriggerWorldLoad).toHaveBeenCalledWith(worldLoadEvent);
    });
  });
});
