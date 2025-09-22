import type {
  CustomCommand,
  CustomCommandRegistry,
} from "@minecraft/server";
import { registerInstanceEventHandlers } from "./eventRegistry";


/**
 * Constructor type for Custom Commands. Constructors must not have parameters.
 */
export type CustomCommandCtor = new () => CustomCommand & Record<string, any>;


const registry: CustomCommandCtor[] = [];

/**
 * Decorator – attach to each Custom Command class to auto-register it.
 */
export function CustomCmd<T extends CustomCommandCtor>(ctor: T) {
  registry.push(ctor);
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

    let runFn: ((...args: any[]) => any) | undefined;
    const maybeStaticRun = (Ctor as any).run;
    if (typeof maybeStaticRun === "function") {
      runFn = maybeStaticRun.bind(Ctor);
    } else if (typeof (instance as any).run === "function") {
      runFn = (instance as any).run.bind(instance);
    }

    if (!runFn) {
      throw new Error(
        `Custom command ${Ctor.name} has no run method. Define a static or instance run(origin, ...args).`
      );
    }

    customCommandRegistry.registerCommand(instance as any, runFn as any);
  }
}
