import {
  ItemUseBeforeEvent,
  StartupEvent,
  WorldLoadAfterEvent,
  world,
} from "@minecraft/server";

/**
 * Internal debug logger. Disabled by default. Enable via `setEventDebugLogging(true)`
 * to trace registration and dispatch when debugging.
 */
let debugEnabled = false;
const LOG_PREFIX = "[stylish:events]";
function dbg(message: string, meta?: Record<string, unknown>) {
  if (!debugEnabled) return;
  try {
    if (meta) console.debug(LOG_PREFIX, message, meta);
    else console.debug(LOG_PREFIX, message);
  } catch {
    // ignore logging errors
  }
}
/** Enables or disables debug logging for event registration/dispatch. */
export function setEventDebugLogging(enabled: boolean) {
  debugEnabled = !!enabled;
}

// Track instance (non-static) methods and registries per event
export type Class<T = any> = abstract new (...args: any[]) => T;

// Strongly-typed mapping between event names and their callback parameter types
export interface EventMap {
  startup: StartupEvent;
  worldLoad: WorldLoadAfterEvent;
  beforeItemUse: ItemUseBeforeEvent;
}
type EventName = keyof EventMap;
// Handlers may be sync or async. Promises are not awaited by the dispatcher.
type Handler<E extends EventName> = (e: EventMap[E]) => void | Promise<void>;

const registries: { [K in EventName]?: Array<Handler<K>> } =
  Object.create(null);
function getRegistry<E extends EventName>(event: E) {
  return (registries[event] ??= []) as Array<Handler<E>>;
}
const instanceEventMethods: WeakMap<
  Class,
  Map<EventName, PropertyKey[]>
> = new WeakMap();

// Lazy wiring of platform events (only after startup)
const subscribed: Partial<Record<EventName, boolean>> = {};
let startupTriggered = false;

function dispatch<E extends EventName>(event: E) {
  return (e: EventMap[E]) => {
    const reg = getRegistry(event);
    dbg("dispatch", { event, count: reg.length });
    for (const fn of reg) fn(e as any);
  };
}

function wirePlatformEvent<E extends EventName>(event: E) {
  dbg("wirePlatformEvent", { event });
  if (subscribed[event]) {
    dbg("alreadyWired", { event });
    return;
  }
  switch (event) {
    case "startup":
    case "worldLoad":
      // wired in init()
      break;
    case "beforeItemUse":
      dbg("subscribe", { source: "world.beforeEvents.itemUse" });
      world.beforeEvents.itemUse.subscribe(dispatch("beforeItemUse"));
      subscribed[event] = true;
      break;
    default:
      // Shouldn't reach here
      break;
  }
}

function maybeWirePlatformEvents(event?: EventName) {
  dbg("maybeWirePlatformEvents", { startupTriggered });
  if (!startupTriggered) {
    return;
  }
  if (event) {
    if (getRegistry(event).length > 0) wirePlatformEvent(event);
    return;
  }
  for (const evt of Object.keys(registries) as EventName[]) {
    if (getRegistry(evt).length > 0) wirePlatformEvent(evt);
  }
}

/**
 * Creates a decorator function for the given event name.
 * The decorator can be used in two ways:
 * 1. As a method decorator on static or instance methods.
 * 2. As a direct function call to register a standalone function.
 *
 * @param event The name of the event to register for.
 * @returns A decorator function.
 */
// Note: The method-decorator overload intentionally uses a permissive function
// type to avoid cross-package type incompatibilities when consumers have a
// different @minecraft/server instance. The direct function registration keeps
// strong typing with our local EventMap.
export type EventDecorator<E extends EventName> = ((fn: Handler<E>) => void) &
  ((
    target: any,
    propertyKey: string | symbol,
    descriptor: any
  ) => any);

export function createEventDecorator<E extends EventName>(
  event: E
): EventDecorator<E> {
  const impl = function EventDecorator(
    target: any,
    propertyKey?: string | symbol,
    descriptor?: any
  ): any {
    // Direct function registration: OnX(fn)
    if (
      typeof target === "function" &&
      propertyKey === undefined &&
      descriptor === undefined
    ) {
      dbg("register:function", { event });
      getRegistry(event).push(target as Handler<E>);
      maybeWirePlatformEvents(event as EventName);
      return;
    }

    // Method decorator usage
    if (
      propertyKey !== undefined &&
      descriptor &&
      typeof descriptor.value === "function"
    ) {
      // Static method: target is the constructor function
      if (typeof target === "function") {
        dbg("register:static", { event, propertyKey: String(propertyKey) });
        const bound = (descriptor.value as any).bind(target) as Handler<E>;
        getRegistry(event).push(bound);
        maybeWirePlatformEvents(event as EventName);
        return descriptor;
      }

      // Instance method: target is the prototype, store metadata to register later for each instance
      dbg("annotate:instance", { event, propertyKey: String(propertyKey) });
      const ctor = (target as object).constructor as Class;
      let map = instanceEventMethods.get(ctor);
      if (!map) {
        map = new Map<EventName, PropertyKey[]>();
        instanceEventMethods.set(ctor, map);
      }
      const list = map.get(event) ?? [];
      if (!list.includes(propertyKey)) list.push(propertyKey);
      map.set(event, list);
      return descriptor;
    }
  } as any;
  return impl as EventDecorator<E>;
}

export const OnStartup = createEventDecorator("startup");
export const OnWorldLoad = createEventDecorator("worldLoad");
export const OnBeforeItemUse = createEventDecorator("beforeItemUse");

/**
 * Registers all instance-bound handlers for the given object instance.
 * Intended to be called right after constructing an instance (before triggering startup).
 */
export function registerInstanceEventHandlers(instance: any) {
  if (!instance) return;
  const ctor = instance.constructor as Class;
  const map = instanceEventMethods.get(ctor);
  if (!map) return;
  for (const [event, keys] of map) {
    const reg = getRegistry(event as EventName);
    for (const key of keys) {
      const fn = (instance as any)[key];
      if (typeof fn === "function") {
        reg.push(fn.bind(instance));
      }
    }
    dbg("register:instance", {
      event,
      class: (ctor as any)?.name ?? "<anonymous>",
      count: keys.length,
    });
    maybeWirePlatformEvents(event as EventName);
  }
}

/**
 * Class decorator – wraps the constructor so that any time an instance is created,
 * its instance event methods are automatically registered.
 */
export function RegisterEvents<T extends new (...args: any[]) => any>(
  Ctor: T
): T {
  return class extends Ctor {
    constructor(...args: any[]) {
      super(...args);
      registerInstanceEventHandlers(this);
    }
  } as unknown as T;
}

/**
 * Invokes OnStartup event handlers.
 */
export function triggerStartupEvent(e: StartupEvent) {
  startupTriggered = true;
  // Wire any platform events that have pending handlers
  maybeWirePlatformEvents();
  const reg = getRegistry("startup");
  dbg("triggerStartupEvent", { count: reg.length });
  for (const fn of reg) {
    fn(e);
  }
}

/**
 * Invokes OnWorldLoad event handlers.
 */
export function triggerWorldLoadEvent(e: WorldLoadAfterEvent) {
  const reg = getRegistry("worldLoad");
  dbg("triggerWorldLoadEvent", { count: reg.length });
  for (const fn of reg) {
    fn(e);
  }
}
