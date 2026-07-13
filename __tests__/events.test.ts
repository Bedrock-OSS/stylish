/* eslint-disable @typescript-eslint/no-var-requires */
import { jest } from "@jest/globals";

beforeEach(() => {
  jest.resetModules();
});

function makeSignal() {
  const callbacks: Array<(e: any) => void> = [];
  return {
    subscribe: jest.fn((cb: any, _options?: any) => {
      callbacks.push(cb);
      return cb;
    }),
    emit(e: any) {
      for (const cb of callbacks) cb(e);
    },
  };
}

describe("event decorators", () => {
  test("wires world after/before and system events lazily after startup", () => {
    jest.isolateModules(() => {
      const playerJoin = makeSignal();
      const playerBreakBlock = makeSignal();
      const shutdown = makeSignal();
      const scriptEventReceive = makeSignal();

      const mc = require("@minecraft/server");
      mc.world.afterEvents = { playerJoin } as any;
      mc.world.beforeEvents = { playerBreakBlock } as any;
      mc.system.beforeEvents = { shutdown } as any;
      mc.system.afterEvents = { scriptEventReceive } as any;

      const {
        OnPlayerJoin,
        OnBeforePlayerBreakBlock,
        OnBeforeShutdown,
        OnScriptEventReceive,
        triggerStartupEvent,
      } = require("../src/eventRegistry");

      const joinHandler = jest.fn();
      const breakHandler = jest.fn();
      const shutdownHandler = jest.fn();
      const scriptHandler = jest.fn();

      OnPlayerJoin(joinHandler);
      OnBeforePlayerBreakBlock(breakHandler);
      OnBeforeShutdown(shutdownHandler);
      OnScriptEventReceive(scriptHandler);

      // Nothing is subscribed before startup
      expect(playerJoin.subscribe).not.toHaveBeenCalled();
      expect(playerBreakBlock.subscribe).not.toHaveBeenCalled();

      triggerStartupEvent({} as any);

      expect(playerJoin.subscribe).toHaveBeenCalledTimes(1);
      expect(playerBreakBlock.subscribe).toHaveBeenCalledTimes(1);
      expect(shutdown.subscribe).toHaveBeenCalledTimes(1);
      expect(scriptEventReceive.subscribe).toHaveBeenCalledTimes(1);

      const joinEvent = { playerName: "steve" };
      playerJoin.emit(joinEvent);
      expect(joinHandler).toHaveBeenCalledWith(joinEvent);

      const breakEvent = { cancel: false };
      playerBreakBlock.emit(breakEvent);
      expect(breakHandler).toHaveBeenCalledWith(breakEvent);

      shutdown.emit({});
      expect(shutdownHandler).toHaveBeenCalled();

      scriptEventReceive.emit({ id: "test:event" });
      expect(scriptHandler).toHaveBeenCalledWith({ id: "test:event" });
    });
  });

  test("worldLoad is wired lazily through the generic path", () => {
    jest.isolateModules(() => {
      const worldLoad = makeSignal();

      const mc = require("@minecraft/server");
      mc.world.afterEvents = { worldLoad } as any;
      mc.world.beforeEvents = {} as any;

      const {
        OnWorldLoad,
        triggerStartupEvent,
      } = require("../src/eventRegistry");

      const handler = jest.fn();
      OnWorldLoad(handler);
      expect(worldLoad.subscribe).not.toHaveBeenCalled();

      triggerStartupEvent({} as any);
      expect(worldLoad.subscribe).toHaveBeenCalledTimes(1);

      const loadEvent = { loaded: true };
      worldLoad.emit(loadEvent);
      expect(handler).toHaveBeenCalledWith(loadEvent);
    });
  });

  test("does not subscribe to events without handlers", () => {
    jest.isolateModules(() => {
      const entityDie = makeSignal();
      const playerJoin = makeSignal();

      const mc = require("@minecraft/server");
      mc.world.afterEvents = { entityDie, playerJoin } as any;
      mc.world.beforeEvents = {} as any;

      const {
        OnPlayerJoin,
        triggerStartupEvent,
      } = require("../src/eventRegistry");

      OnPlayerJoin(jest.fn());
      triggerStartupEvent({} as any);

      expect(playerJoin.subscribe).toHaveBeenCalledTimes(1);
      expect(entityDie.subscribe).not.toHaveBeenCalled();
    });
  });

  test("defers subscription via system.run when subscribe is called in restricted-execution mode", () => {
    jest.isolateModules(() => {
      let restricted = true;
      const callbacks: Array<(e: any) => void> = [];
      const entityHurt = {
        subscribe: jest.fn((cb: any) => {
          if (restricted) throw new Error("restricted-execution mode");
          callbacks.push(cb);
          return cb;
        }),
      };

      const mc = require("@minecraft/server");
      mc.world.afterEvents = { entityHurt } as any;
      mc.world.beforeEvents = {} as any;
      const deferred: Array<() => void> = [];
      mc.system.run = jest.fn((cb: () => void) => {
        deferred.push(cb);
        return 1;
      });

      const {
        OnEntityHurt,
        triggerStartupEvent,
      } = require("../src/eventRegistry");

      triggerStartupEvent({} as any);

      // Simulates registration from inside a before-event handler
      const handler = jest.fn();
      OnEntityHurt(handler);
      expect(entityHurt.subscribe).toHaveBeenCalledTimes(1);
      expect(mc.system.run).toHaveBeenCalledTimes(1);

      // Next tick: restricted mode is over, the deferred retry succeeds
      restricted = false;
      deferred.forEach((cb) => cb());
      expect(entityHurt.subscribe).toHaveBeenCalledTimes(2);

      const hurtEvent = { damage: 5 };
      callbacks.forEach((cb) => cb(hurtEvent));
      expect(handler).toHaveBeenCalledWith(hurtEvent);
    });
  });

  test("filtered decorators subscribe with native options and dedupe identical filters", () => {
    jest.isolateModules(() => {
      const entityHurt = makeSignal();

      const mc = require("@minecraft/server");
      mc.world.afterEvents = { entityHurt } as any;
      mc.world.beforeEvents = {} as any;

      const {
        OnEntityHurt,
        triggerStartupEvent,
      } = require("../src/eventRegistry");

      const bossHandler1 = jest.fn();
      const bossHandler2 = jest.fn();
      const cowHandler = jest.fn();
      const plainHandler = jest.fn();

      OnEntityHurt({ entityTypes: ["wiki:boss"] })(bossHandler1);
      OnEntityHurt({ entityTypes: ["wiki:boss"] })(bossHandler2); // same filter
      OnEntityHurt({ entityTypes: ["minecraft:cow"] })(cowHandler);
      OnEntityHurt(plainHandler);

      triggerStartupEvent({} as any);

      // one unfiltered + two distinct filtered subscriptions (identical filters share one)
      expect(entityHurt.subscribe).toHaveBeenCalledTimes(3);
      const optionArgs = entityHurt.subscribe.mock.calls.map((c: any[]) => c[1]);
      expect(optionArgs).toContainEqual({ entityTypes: ["wiki:boss"] });
      expect(optionArgs).toContainEqual({ entityTypes: ["minecraft:cow"] });
      expect(optionArgs).toContain(undefined);

      // handlers with the same filter share a dispatcher
      const bossCall = entityHurt.subscribe.mock.calls.find(
        (c: any[]) => c[1]?.entityTypes?.[0] === "wiki:boss"
      )!;
      const hurtEvent = { damage: 3 };
      bossCall[0](hurtEvent);
      expect(bossHandler1).toHaveBeenCalledWith(hurtEvent);
      expect(bossHandler2).toHaveBeenCalledWith(hurtEvent);
      expect(cowHandler).not.toHaveBeenCalled();
      expect(plainHandler).not.toHaveBeenCalled();
    });
  });

  test("ScriptEvent routes by id over a single namespace-filtered subscription", () => {
    jest.isolateModules(() => {
      const scriptEventReceive = makeSignal();
      (scriptEventReceive as any).unsubscribe = jest.fn();

      const mc = require("@minecraft/server");
      mc.world.afterEvents = {} as any;
      mc.world.beforeEvents = {} as any;
      mc.system.afterEvents = { scriptEventReceive } as any;

      const {
        ScriptEvent,
        triggerStartupEvent,
      } = require("../src/eventRegistry");

      const spawnHandler = jest.fn();
      const despawnHandler = jest.fn();
      ScriptEvent("wiki:spawn_boss")(spawnHandler);
      ScriptEvent("wiki:despawn_boss")(despawnHandler);

      expect(scriptEventReceive.subscribe).not.toHaveBeenCalled();
      triggerStartupEvent({} as any);

      // both routes share one subscription, natively filtered to the namespace
      expect(scriptEventReceive.subscribe).toHaveBeenCalledTimes(1);
      expect(scriptEventReceive.subscribe.mock.calls[0][1]).toEqual({
        namespaces: ["wiki"],
      });

      scriptEventReceive.emit({ id: "wiki:spawn_boss", message: "m" });
      expect(spawnHandler).toHaveBeenCalledWith({ id: "wiki:spawn_boss", message: "m" });
      expect(despawnHandler).not.toHaveBeenCalled();

      scriptEventReceive.emit({ id: "wiki:unknown" });
      expect(spawnHandler).toHaveBeenCalledTimes(1);

      // a new namespace after wiring re-subscribes with the widened filter
      const otherHandler = jest.fn();
      ScriptEvent("other:thing")(otherHandler);
      expect((scriptEventReceive as any).unsubscribe).toHaveBeenCalledTimes(1);
      expect(scriptEventReceive.subscribe).toHaveBeenCalledTimes(2);
      expect(scriptEventReceive.subscribe.mock.calls[1][1]).toEqual({
        namespaces: ["wiki", "other"],
      });
    });
  });

  test("RegisterEvents wrapper registers instance handlers (prototype chain walk)", () => {
    jest.isolateModules(() => {
      const playerJoin = makeSignal();

      const mc = require("@minecraft/server");
      mc.world.afterEvents = { playerJoin } as any;
      mc.world.beforeEvents = {} as any;

      const {
        OnPlayerJoin,
        RegisterEvents,
        triggerStartupEvent,
      } = require("../src/eventRegistry");

      const received: any[] = [];
      class Service {
        tag = "svc";
        onJoin(e: any) {
          received.push([this.tag, e]);
        }
      }
      OnPlayerJoin(
        Service.prototype,
        "onJoin",
        Object.getOwnPropertyDescriptor(Service.prototype, "onJoin")
      );
      const Wrapped = RegisterEvents(Service);
      new Wrapped();

      triggerStartupEvent({} as any);
      const joinEvent = { playerName: "alex" };
      playerJoin.emit(joinEvent);
      expect(received).toEqual([["svc", joinEvent]]);
    });
  });

  test("registering after startup wires immediately", () => {
    jest.isolateModules(() => {
      const entitySpawn = makeSignal();

      const mc = require("@minecraft/server");
      mc.world.afterEvents = { entitySpawn } as any;
      mc.world.beforeEvents = {} as any;

      const {
        OnEntitySpawn,
        triggerStartupEvent,
      } = require("../src/eventRegistry");

      triggerStartupEvent({} as any);
      expect(entitySpawn.subscribe).not.toHaveBeenCalled();

      const handler = jest.fn();
      OnEntitySpawn(handler);
      expect(entitySpawn.subscribe).toHaveBeenCalledTimes(1);

      entitySpawn.emit({ entity: "cow" });
      expect(handler).toHaveBeenCalledWith({ entity: "cow" });
    });
  });
});
