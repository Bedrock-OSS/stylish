/* eslint-disable @typescript-eslint/no-var-requires */
import { jest } from "@jest/globals";

beforeEach(() => {
  jest.resetModules();
});

describe("scheduling decorators", () => {
  test("tasks registered before startup start when startup fires", () => {
    jest.isolateModules(() => {
      const mc = require("@minecraft/server");
      mc.system.runInterval = jest.fn(() => 1);
      mc.system.runTimeout = jest.fn(() => 2);
      mc.world.afterEvents = {} as any;
      mc.world.beforeEvents = {} as any;

      const { Interval, Timeout, OnTick } = require("../src/scheduler");
      const { triggerStartupEvent } = require("../src/eventRegistry");

      const everySecond = jest.fn();
      const once = jest.fn();
      const everyTick = jest.fn();

      Interval(20)(everySecond);
      Timeout(100)(once);
      OnTick(everyTick);

      expect(mc.system.runInterval).not.toHaveBeenCalled();
      expect(mc.system.runTimeout).not.toHaveBeenCalled();

      triggerStartupEvent({} as any);

      expect(mc.system.runInterval).toHaveBeenCalledWith(everySecond, 20);
      expect(mc.system.runInterval).toHaveBeenCalledWith(everyTick, 1);
      expect(mc.system.runTimeout).toHaveBeenCalledWith(once, 100);
    });
  });

  test("tasks registered after startup start immediately", () => {
    jest.isolateModules(() => {
      const mc = require("@minecraft/server");
      mc.system.runInterval = jest.fn(() => 1);
      mc.world.afterEvents = {} as any;
      mc.world.beforeEvents = {} as any;

      const { Interval } = require("../src/scheduler");
      const { triggerStartupEvent } = require("../src/eventRegistry");

      triggerStartupEvent({} as any);

      const fn = jest.fn();
      Interval(10)(fn);
      expect(mc.system.runInterval).toHaveBeenCalledWith(fn, 10);
    });
  });

  test("static method decoration binds to the class", () => {
    jest.isolateModules(() => {
      const mc = require("@minecraft/server");
      const started: Array<() => void> = [];
      mc.system.runInterval = jest.fn((cb: () => void) => {
        started.push(cb);
        return 1;
      });
      mc.world.afterEvents = {} as any;
      mc.world.beforeEvents = {} as any;

      const { Interval } = require("../src/scheduler");
      const { triggerStartupEvent } = require("../src/eventRegistry");

      const calls: any[] = [];
      class Jobs {
        static tick() {
          calls.push(this);
        }
      }
      Interval(5)(
        Jobs,
        "tick",
        Object.getOwnPropertyDescriptor(Jobs, "tick")
      );

      triggerStartupEvent({} as any);
      started.forEach((cb) => cb());
      expect(calls).toEqual([Jobs]);
    });
  });
});
