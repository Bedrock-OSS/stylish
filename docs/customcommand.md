# CustomCmd – Custom Command decorator

Attach `@CustomCmd` to a class implementing the Minecraft `CustomCommand` shape. On startup, Stylish will instantiate and register it with the runtime's `customCommandRegistry`, wiring your `run` handler.

## Example

```ts
import { CustomCmd } from "@bedrock-oss/stylish";
import { CommandPermissionLevel, CustomCommandOrigin, CustomCommandResult, CustomCommandStatus, Player } from "@minecraft/server";

@CustomCmd
class HelloCommand {
  // Required attributes
  readonly name = "example:hello";
  readonly description = "Greets the command source";
  readonly permissionLevel = CommandPermissionLevel.Any;
  // Optional attributes
  readonly cheatsRequired = false;

  // You can use either a static or instance `run` method
  static run(origin: CustomCommandOrigin): CustomCommandResult {
    const { sourceEntity } = origin;
    if (sourceEntity instanceof Player) {
      sourceEntity.sendMessage(`Hello, ${sourceEntity.name}`);
      return { status: CustomCommandStatus.Success };
    }
    return { status: CustomCommandStatus.Failure };
  }
}
```

Decorated classes will be registered with the `CustomCommandRegistry` when
`init()` executes.