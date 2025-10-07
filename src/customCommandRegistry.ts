import { CustomCommandParamType, type CustomCommand, type CustomCommandParameter, type CustomCommandRegistry } from "@minecraft/server";
import { registerInstanceEventHandlers } from "./eventRegistry";


/**
 * Definition for each parameter expected by the custom
 * command.
 */
export interface StylishCommandParameter extends CustomCommandParameter {
  /** Optional set of enum values (required when type === Enum). */
  values?: readonly string[] | string[];
}

/**
 * Define the custom command, including name, permissions, and
 * parameters.
 */
export interface StylishCustomCommand extends CustomCommand {
  mandatoryParameters?: StylishCommandParameter[];
  optionalParameters?: StylishCommandParameter[];
}

/**
 * Constructor type for Custom Commands. Constructors must not have parameters.
 */
export type CustomCommandCtor = new () => StylishCustomCommand & Record<string, any>;

const registry: CustomCommandCtor[] = [];

/**
 * Decorator – attach to each Custom Command class to auto-register it.
 */
export function CustomCmd<T extends CustomCommandCtor>(ctor: T): T {
  registry.push(ctor as CustomCommandCtor);
  return ctor;
}

/**
 * Call this in worldInitialize to register all decorated components.
 */
export function registerAllCustomCommands(
  customCommandRegistry: CustomCommandRegistry
) {
  for (const Ctor of registry) {
    const instance = new Ctor();
    registerInstanceEventHandlers(instance);


    // Look for either a static or instance run method
    const hasStaticRun = typeof (Ctor as any).run === "function";
    const hasInstanceRun = typeof instance.run === "function";
    if (!hasStaticRun && !hasInstanceRun) {
      throw new Error(
        `Custom command ${Ctor.name} has no run method. A static or instance run(origin, ...args) is required.`
      );
    }
    const runFn = hasStaticRun
      ? (Ctor as any).run.bind(Ctor)
      : instance.run.bind(instance);


    // Auto-register any enum parameter sets (mandatory or optional)
    const enumNames = new Set<string>();
    /**
     * @private
     */
    const collect = (arr?: StylishCommandParameter[]) => {
      if (!Array.isArray(arr)) return;
      for (const def of arr) {
        try {
          if (def.type === CustomCommandParamType.Enum &&
              Array.isArray(def.values) &&
              def.values.length > 0 &&
              !enumNames.has(def.name) // ignore duplicates
            ) {
            enumNames.add(def.name);
            customCommandRegistry.registerEnum(def.name, def.values);
          }
        } catch (e) {
          console.warn(`Failed to register enum parameter for command ${instance.name}:`, e);
        }
      }
    };
    collect(instance.mandatoryParameters as StylishCommandParameter[] | undefined);
    collect(instance.optionalParameters as StylishCommandParameter[] | undefined);


    customCommandRegistry.registerCommand(instance, runFn);
  }
}
