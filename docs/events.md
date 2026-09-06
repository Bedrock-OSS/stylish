# Events

Decorator-driven event registration for pack initialization and more. This guide covers:

- `@OnStartup` - run methods/functions when the pack starts (typed `StartupEvent`)
- `@OnWorldLoad` - run after world load (typed `WorldLoadAfterEvent`)
- `@On<Event>` - one decorator per world *after* event (e.g. `@OnPlayerJoin`, `@OnEntityDie`, `@OnItemUse`)
- `@OnBefore<Event>` - one decorator per world *before* event (e.g. `@OnBeforeItemUse`, `@OnBeforePlayerBreakBlock`)
- `@OnScriptEventReceive` / `@OnBeforeShutdown` - system events
- `@RegisterEvents` - auto-register instance event methods when you construct objects

## Available event decorators

Every event exposed by `@minecraft/server` (currently 2.8.0) has a matching decorator. The handler argument is strongly typed to the corresponding event class.

**System events:** `OnStartup`, `OnBeforeShutdown`, `OnScriptEventReceive`

**World after events:** `OnBlockContainerClosed`, `OnBlockContainerOpened`, `OnBlockExplode`, `OnButtonPush`, `OnDataDrivenEntityTrigger`, `OnEffectAdd`, `OnEntityContainerClosed`, `OnEntityContainerOpened`, `OnEntityDie`, `OnEntityHeal`, `OnEntityHealthChanged`, `OnEntityHitBlock`, `OnEntityHitEntity`, `OnEntityHurt`, `OnEntityItemDrop`, `OnEntityItemPickup`, `OnEntityLoad`, `OnEntityRemove`, `OnEntitySpawn`, `OnEntityUpgrade`, `OnExplosion`, `OnGameRuleChange`, `OnItemCompleteUse`, `OnItemReleaseUse`, `OnItemStartUse`, `OnItemStartUseOn`, `OnItemStopUse`, `OnItemStopUseOn`, `OnItemUse`, `OnLeverAction`, `OnPistonActivate`, `OnPlayerBreakBlock`, `OnPlayerButtonInput`, `OnPlayerDimensionChange`, `OnPlayerEmote`, `OnPlayerGameModeChange`, `OnPlayerHotbarSelectedSlotChange`, `OnPlayerInputModeChange`, `OnPlayerInputPermissionCategoryChange`, `OnPlayerInteractWithBlock`, `OnPlayerInteractWithEntity`, `OnPlayerInventoryItemChange`, `OnPlayerJoin`, `OnPlayerLeave`, `OnPlayerPlaceBlock`, `OnPlayerSpawn`, `OnPlayerSwingStart`, `OnPressurePlatePop`, `OnPressurePlatePush`, `OnProjectileHitBlock`, `OnProjectileHitEntity`, `OnTargetBlockHit`, `OnTripWireTrip`, `OnWeatherChange`, `OnWorldLoad`

**World before events:** `OnBeforeEffectAdd`, `OnBeforeEntityHeal`, `OnBeforeEntityHurt`, `OnBeforeEntityItemPickup`, `OnBeforeEntityRemove`, `OnBeforeExplosion`, `OnBeforeItemUse`, `OnBeforePlayerBreakBlock`, `OnBeforePlayerGameModeChange`, `OnBeforePlayerInteractWithBlock`, `OnBeforePlayerInteractWithEntity`, `OnBeforePlayerLeave`, `OnBeforeWeatherChange`

All decorators work on static methods, instance methods (with `@RegisterEvents`), or as direct function calls:

```ts
import { OnPlayerJoin, OnBeforePlayerBreakBlock } from '@bedrock-oss/stylish';

// Direct function registration
OnPlayerJoin((e) => {
  // e: PlayerJoinAfterEvent
});

class Protection {
  @OnBeforePlayerBreakBlock
  static onBreak(e) {
    // e: PlayerBreakBlockBeforeEvent
    if (e.block.typeId === 'minecraft:bedrock') e.cancel = true;
  }
}
```

Platform subscriptions are wired lazily: nothing is subscribed until `init()` runs and startup fires, and only events that actually have handlers get subscribed. Wiring happens inside the startup callback, which runs with early-execution privilege where `subscribe` is allowed. Handlers registered later (at normal runtime) are wired immediately; if that happens from inside a before-event callback (restricted-execution mode, where `subscribe` throws), the subscription is automatically deferred one tick via `system.run`.

## Native event filters

Events whose native `subscribe` accepts filter options (e.g. `EntityEventOptions`, `BlockEventOptions`, `ScriptEventMessageFilterOptions`) can be filtered *in native code* by calling the decorator with the options first. Events that don't match the filter never cross the native->JS boundary at all - much cheaper than filtering inside the handler:

```ts
import { OnEntityHurt, OnDataDrivenEntityTrigger } from '@bedrock-oss/stylish';

class BossFight {
  @OnEntityHurt({ entityTypes: ['wiki:boss'] })
  static onBossHurt(e) {
    // only fires for wiki:boss entities
  }

  @OnDataDrivenEntityTrigger({ entityTypes: ['wiki:boss'], eventTypes: ['wiki:enrage'] })
  static onEnrage(e) { ... }
}
```

The options are typed per event, and passing options to an event that doesn't support them is a compile error. Handlers using *identical* options share a single native subscription; distinct options get their own.

## `@ScriptEvent`

Routes `/scriptevent <id> <message>` commands to the decorated method (or directly registered function) by exact id. All routes share **one** native subscription, natively filtered to the registered namespaces, and dispatch is an O(1) map lookup - no `if (e.id === ...)` ladders:

```ts
import { ScriptEvent } from '@bedrock-oss/stylish';

class Admin {
  @ScriptEvent('wiki:spawn_boss')
  static spawnBoss(e) {
    // e: ScriptEventCommandMessageAfterEvent
    // e.message holds the command payload
  }
}

// or directly:
ScriptEvent('wiki:reload_config')(() => reload());
```

## Scheduling: `@Interval`, `@Timeout`, `@OnTick`

Run methods on a tick schedule. Tasks start once the pack's startup event fires (tasks registered later start immediately) and run for the lifetime of the pack:

```ts
import { Interval, Timeout, OnTick, RegisterEvents } from '@bedrock-oss/stylish';

@RegisterEvents
class Clock {
  @Interval(20)
  everySecond() { ... }     // per instance

  @Timeout(100)
  fiveSecondsAfterStartup() { ... }

  @OnTick
  everyTick() { ... }
}
```

Like event decorators, they work on static methods, instance methods (with `@RegisterEvents`), or as direct calls: `Interval(20)(fn)`.

> [!WARNING]
> The phase of an interval is arbitrary: `system.runInterval` first fires relative to the tick it was registered on, not to tick 0. Do not gate a slower rhythm inside the handler on `system.currentTick % n`. An `@Interval(4)` only ever visits a quarter of the residues mod `n`, and if the registration tick was not a multiple of 4, `system.currentTick % 12 === 0` is never true and the handler silently does nothing for the life of the world. Count down your own tick counter instead:
>
> ```ts
> let fireworkTimer = 0;
>
> @Interval(4)
> static fastTick() {
>   fireworkTimer -= 4;
>   if (fireworkTimer <= 0) {
>     fireworkTimer = 12;
>     launchFirework();
>   }
> }
> ```

## `@WorldProperty`

Backs a class field with a world dynamic property. Reads hit native `world.getDynamicProperty` once and are cached in JS afterwards; writes update the cache and write through natively. Declare the field **without an initializer** and pass the default to the decorator (a field initializer would overwrite the persisted value on every construction):

```ts
import { WorldProperty, invalidateWorldProperty } from '@bedrock-oss/stylish';

class Config {
  @WorldProperty('wiki:difficulty', 1)
  difficulty!: number;

  @WorldProperty('wiki:settings', { volume: 1 }, { json: true })
  settings!: { volume: number };  // JSON-serialized transparently
}
```

The cache is keyed by property id, so all instances/fields bound to the same id share one value (dynamic properties are global anyway). If something else writes the dynamic property directly, call `invalidateWorldProperty(id)` (or with no argument for all) to force a native re-read. Don't touch decorated fields during early execution - dynamic properties aren't available until after startup.

## `@OnStartup`

Use `@OnStartup` to mark methods to run after your pack initializes.

- Static method: runs once at startup, `this` is the class (constructor)
- Instance method: runs at startup with `this` bound to the instance

Example (static):
```ts
import { OnStartup } from '@bedrock-oss/stylish';

class Bootstrap {
  @OnStartup
  static registerGlobals(e) {
    // e: StartupEvent
    // runs once at startup; `this` is the class (constructor)
  }
}
```

Example (instance):
```ts
import { OnStartup, RegisterEvents } from '@bedrock-oss/stylish';

@RegisterEvents
class Service {
  constructor(readonly name: string) {}

  @OnStartup
  init(e) {
    // e: StartupEvent
    // runs at startup; `this` is the instance
  }
}

// Any instances you create will be auto-registered
const a = new Service('alpha');
const b = new Service('beta');
```

If you are using `@ItemComponent`/`@BlockComponent`, instances created during registration are already wired so their `@OnStartup` methods run automatically.

## `@OnWorldLoad`

`@OnWorldLoad` runs after the world has loaded and receives the `WorldLoadAfterEvent` argument.

```ts
import { OnWorldLoad, RegisterEvents } from '@bedrock-oss/stylish';

@RegisterEvents
class Loader {
  @OnWorldLoad
  onLoad(e) {
    // e: WorldLoadAfterEvent
  }
}
```

## `@RegisterEvents`

`RegisterEvents` is a class decorator that wraps the constructor so that any time you create a new instance, its instance event handlers (such as methods decorated with `@OnStartup`) are automatically registered.

```ts
import { OnStartup, RegisterEvents } from '@bedrock-oss/stylish';

@RegisterEvents
class Service {
  @OnStartup
  init(e) {
    // e: StartupEvent
    // runs at startup with `this` bound to the instance
  }
}

const a = new Service(); // auto-registered
const b = new Service(); // auto-registered
```

Use `@RegisterEvents` for classes you instantiate yourself, outside of the library's component registries.