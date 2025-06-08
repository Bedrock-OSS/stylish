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

describe("initV1", () => {
  test("subscribes to worldInitialize and registers components", () => {
    jest.isolateModules(() => {
      const event = {
        itemComponentRegistry: "i",
        blockComponentRegistry: "b",
      } as any;
      const subscribe = jest.fn((cb: any) => cb(event));
      const mc = require("@minecraft/server");
      mc.world.beforeEvents = { worldInitialize: { subscribe } } as any;
      const mockItems = jest.fn();
      const mockBlocks = jest.fn();
      jest.doMock("../src/itemRegistry", () => ({
        registerAllItemComponents: mockItems,
      }));
      jest.doMock("../src/blockRegistry", () => ({
        registerAllBlockComponents: mockBlocks,
      }));
      const index = require("../src/index");

      index.initV1();
      expect(subscribe).toHaveBeenCalled();
      expect(mockItems).toHaveBeenCalledWith("i");
      expect(mockBlocks).toHaveBeenCalledWith("b");
    });
  });
});

describe("initV2", () => {
  test("subscribes to startup and registers components", () => {
    jest.isolateModules(() => {
      const event = {
        itemComponentRegistry: "i",
        blockComponentRegistry: "b",
      } as any;
      const subscribe = jest.fn((cb: any) => cb(event));
      const mc = require("@minecraft/server");
      mc.system.beforeEvents = { startup: { subscribe } } as any;
      const mockItems = jest.fn();
      const mockBlocks = jest.fn();
      jest.doMock("../src/itemRegistry", () => ({
        registerAllItemComponents: mockItems,
      }));
      jest.doMock("../src/blockRegistry", () => ({
        registerAllBlockComponents: mockBlocks,
      }));
      const index = require("../src/index");

      index.initV2();
      expect(subscribe).toHaveBeenCalled();
      expect(mockItems).toHaveBeenCalledWith("i");
      expect(mockBlocks).toHaveBeenCalledWith("b");
    });
  });
});
