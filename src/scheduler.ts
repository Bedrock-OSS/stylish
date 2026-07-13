import { system } from "@minecraft/server";
import {
  AnyHandler,
  GenericDecorator,
  isStartupTriggered,
  makeDecorator,
  onStartupTriggered,
} from "./decoratorCore";

interface ScheduledTask {
  fn: AnyHandler;
  ticks: number;
  kind: "interval" | "timeout";
}

// Tasks registered before startup are held here and started when it fires.
const pending: ScheduledTask[] = [];

function start(task: ScheduledTask) {
  if (task.kind === "interval") {
    system.runInterval(task.fn as () => void, task.ticks);
  } else {
    system.runTimeout(task.fn as () => void, task.ticks);
  }
}

function schedule(task: ScheduledTask) {
  if (isStartupTriggered()) {
    start(task);
  } else {
    pending.push(task);
  }
}

onStartupTriggered(() => {
  for (const task of pending) start(task);
  pending.length = 0;
});

/**
 * Decorator factory - runs the decorated method (or directly registered
 * function) every `ticks` ticks, starting once the pack's startup event has
 * fired. Instance methods (with `@RegisterEvents`) get one interval per
 * instance. The interval runs for the lifetime of the pack.
 *
 * ```ts
 * @Interval(20)
 * static everySecond() { ... }
 * ```
 */
export function Interval(ticks: number): GenericDecorator {
  return makeDecorator((fn) => schedule({ fn, ticks, kind: "interval" }));
}

/**
 * Decorator factory - runs the decorated method (or directly registered
 * function) once, `ticks` ticks after the pack's startup event has fired
 * (or after registration, if registered later).
 *
 * ```ts
 * @Timeout(100)
 * static fiveSecondsIn() { ... }
 * ```
 */
export function Timeout(ticks: number): GenericDecorator {
  return makeDecorator((fn) => schedule({ fn, ticks, kind: "timeout" }));
}

/**
 * Decorator - runs the decorated method (or directly registered function)
 * every tick. Equivalent to `@Interval(1)`.
 */
export const OnTick: GenericDecorator = makeDecorator((fn) =>
  schedule({ fn, ticks: 1, kind: "interval" })
);
