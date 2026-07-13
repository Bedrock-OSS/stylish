/**
 * Shared machinery for stylish decorators: a generic decorator factory that
 * supports static methods, instance methods, and direct function registration,
 * plus the startup gate that all lazy wiring hangs off.
 */

export type Class<T = any> = abstract new (...args: any[]) => T;
export type AnyHandler = (...args: any[]) => any;
/** Receives the final bound handler and stores/wires it somewhere. */
export type RegisterSink = (fn: AnyHandler) => void;

/**
 * A decorator usable on static methods, instance methods, or called directly
 * with a standalone function.
 */
export type GenericDecorator = ((fn: AnyHandler) => void) &
  ((target: any, propertyKey: string | symbol, descriptor: any) => any);

// Instance (non-static) decorated methods, keyed by the constructor whose
// prototype the decorator ran on. Registered per instance later.
const instanceRegistrars: WeakMap<
  Class,
  Array<{ key: PropertyKey; register: RegisterSink }>
> = new WeakMap();

function addInstanceRegistrar(
  ctor: Class,
  key: PropertyKey,
  register: RegisterSink
) {
  let list = instanceRegistrars.get(ctor);
  if (!list) {
    list = [];
    instanceRegistrars.set(ctor, list);
  }
  list.push({ key, register });
}

/**
 * Builds a decorator that funnels the handler into `register`.
 * - Static method: bound to the class and registered immediately.
 * - Instance method: recorded; bound and registered per instance via
 *   {@link registerInstanceEventHandlers} (or the `@RegisterEvents` wrapper).
 * - Direct call with a function: registered as-is.
 */
export function makeDecorator(register: RegisterSink): GenericDecorator {
  return function decorator(
    target: any,
    propertyKey?: string | symbol,
    descriptor?: any
  ): any {
    // Direct function registration: Decorator(fn)
    if (
      typeof target === "function" &&
      propertyKey === undefined &&
      descriptor === undefined
    ) {
      register(target as AnyHandler);
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
        register((descriptor.value as AnyHandler).bind(target));
        return descriptor;
      }

      // Instance method: target is the prototype
      addInstanceRegistrar(
        (target as object).constructor as Class,
        propertyKey,
        register
      );
      return descriptor;
    }
  } as GenericDecorator;
}

/**
 * Registers all instance-bound handlers for the given object instance.
 * Intended to be called right after constructing an instance.
 *
 * Walks the prototype chain so handlers declared on base classes - or on a
 * class wrapped by `@RegisterEvents` (which subclasses the original) - are
 * found as well.
 */
export function registerInstanceEventHandlers(instance: any) {
  if (!instance) return;
  let proto = Object.getPrototypeOf(instance);
  while (proto && proto !== Object.prototype) {
    const list = instanceRegistrars.get(proto.constructor as Class);
    if (list) {
      for (const { key, register } of list) {
        const fn = (instance as any)[key];
        if (typeof fn === "function") {
          register(fn.bind(instance));
        }
      }
    }
    proto = Object.getPrototypeOf(proto);
  }
}

/**
 * Class decorator - wraps the constructor so that any time an instance is created,
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

// ---------------------------------------------------------------------------
// Startup gate: platform work (event subscriptions, timers) is deferred until
// the pack's startup event fires.
// ---------------------------------------------------------------------------

let startupTriggered = false;
const startupWatchers: Array<() => void> = [];

export function isStartupTriggered() {
  return startupTriggered;
}

/**
 * Runs `cb` once startup has been triggered (immediately if it already has).
 */
export function onStartupTriggered(cb: () => void) {
  if (startupTriggered) {
    cb();
    return;
  }
  startupWatchers.push(cb);
}

/** @internal Marks startup as triggered and flushes watchers. */
export function markStartupTriggered() {
  if (startupTriggered) return;
  startupTriggered = true;
  for (const cb of startupWatchers) cb();
  startupWatchers.length = 0;
}
