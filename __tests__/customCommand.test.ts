import { jest } from "@jest/globals";
import { CommandPermissionLevel } from "@minecraft/server";

beforeEach(() => {
  jest.resetModules();
});

describe("CustomCmd decorator", () => {
  test("registers decorated class with static run", async () => {
    const mod = await import("../src/customCommandRegistry");
    const { CustomCmd, registerAllCustomCommands } = mod;

    @CustomCmd
    class TestCmd {
      readonly name = "test:hello";
      readonly description = "Says hello";
      readonly permissionLevel = CommandPermissionLevel.Any;
      static run = jest.fn();
    }

    const registry = { registerCommand: jest.fn() } as any;
    registerAllCustomCommands(registry);

    expect(registry.registerCommand).toHaveBeenCalledTimes(1);
    const [cmdInstance, runFn] = registry.registerCommand.mock.calls[0];
    expect(cmdInstance).toBeInstanceOf(TestCmd);
    expect(typeof runFn).toBe("function");

    // Invoke run handler to ensure it proxies to static run
    (runFn as any)();
    expect(TestCmd.run).toHaveBeenCalled();
  });

  test("registers decorated class with instance run", async () => {
    const mod = await import("../src/customCommandRegistry");
    const { CustomCmd, registerAllCustomCommands } = mod;

    class TestCmd2 {
      readonly name = "test:hi";
      readonly description = "Says hi";
      readonly permissionLevel = CommandPermissionLevel.Any;
      run = jest.fn();
    }
    CustomCmd(TestCmd2 as any);

    const registry = { registerCommand: jest.fn() } as any;
    registerAllCustomCommands(registry);

    expect(registry.registerCommand).toHaveBeenCalledTimes(1);
    const [cmdInstance, runFn] = registry.registerCommand.mock.calls[0];
    expect(cmdInstance).toBeInstanceOf(TestCmd2 as any);
    (runFn as any)();
    expect((cmdInstance as any).run).toHaveBeenCalled();
  });

  test("throws when run is missing", async () => {
    const mod = await import("../src/customCommandRegistry");
    const { CustomCmd, registerAllCustomCommands } = mod;

    class NoRun {
      readonly name = "test:norun";
      readonly description = "no";
      readonly permissionLevel = CommandPermissionLevel.Any;
    }
    CustomCmd(NoRun as any);

    const registry = { registerCommand: jest.fn() } as any;
    expect(() => registerAllCustomCommands(registry)).toThrow(
      /has no run method/
    );
  });
});
