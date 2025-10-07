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

  // @CustomCmd
  // class NoRunInvalid {
  //   readonly name = "test:norun";
  //   readonly description = "no";
  //   readonly permissionLevel = CommandPermissionLevel.Any;
  // }
});

describe("CustomCmd enum auto-registration", () => {
  test("registers enums from mandatory parameters", async () => {
    const mod = await import("../src/customCommandRegistry");
    const { CustomCmd, registerAllCustomCommands } = mod;

    // Provide a mock global enum type identifier to simulate runtime
    (globalThis as any).CustomCommandParamType = { Enum: "enum" };

    class EnumCmd {
      readonly name = "test:enum";
      readonly description = "enum test";
      readonly permissionLevel = 0; // Any
      readonly mandatoryParameters = [
        { name: "test:pos", type: "enum", values: ["a", "b"] },
      ];
      static run = jest.fn();
    }
    CustomCmd(EnumCmd as any);

    const registry = { registerCommand: jest.fn(), registerEnum: jest.fn() } as any;
    registerAllCustomCommands(registry);
    expect(registry.registerEnum).toHaveBeenCalledWith("test:pos", ["a", "b"]);
  });

  test("deduplicates enum registrations across mandatory/optional", async () => {
    const mod = await import("../src/customCommandRegistry");
    const { CustomCmd, registerAllCustomCommands } = mod;
    (globalThis as any).CustomCommandParamType = { Enum: "enum" };

    class DuplicateEnumCmd {
      readonly name = "test:dup";
      readonly description = "dup enum";
      readonly permissionLevel = 0;
      readonly mandatoryParameters = [
        { name: "test:shared", type: "enum", values: ["x", "y"] },
      ];
      readonly optionalParameters = [
        { name: "test:shared", type: "enum", values: ["x", "y"] },
      ];
      static run = jest.fn();
    }
    CustomCmd(DuplicateEnumCmd as any);

    const registry = { registerCommand: jest.fn(), registerEnum: jest.fn() } as any;
    registerAllCustomCommands(registry);
    expect(registry.registerEnum).toHaveBeenCalledTimes(1);
    expect(registry.registerEnum).toHaveBeenCalledWith("test:shared", ["x", "y"]);
  });
});
