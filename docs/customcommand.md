# `CustomCmd`

Attach `@CustomCmd` to a class implementing the Minecraft Script API `CustomCommand`. The class must either have a static or instance `run` method which will be invoked when the command is ran. 

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

Decorated classes will be registered with the `CustomCommandRegistry` when `init()` executes.

## Enum parameter registration

If your command defines `mandatoryParameters` or `optionalParameters` with entries of type `Enum` that include a non-empty `values` array, stylish will automatically invoke `customCommandRegistry.registerEnum(name, values)` the first time it sees each enum name. Duplicate enum names (even if repeated across mandatory/optional arrays) are de-duplicated.

Example:

```ts
readonly mandatoryParameters = [
  {
    name: "example:mode",
    type: CustomCommandParamType.Enum,
    values: ["on", "off"]
  }
];
```

No additional manual startup code is required for enum registration as it's built for streamlined use.
