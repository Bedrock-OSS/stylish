# Events

Decorator-driven event registration for pack initialization and more. This guide covers:

- `@OnStartup` – run methods/functions when the pack starts (typed `StartupEvent`)
- `@OnWorldLoad` – run after world load (typed `WorldLoadAfterEvent`)
- `@OnBeforeItemUse` – before item use (typed `ItemUseBeforeEvent`)
- `@RegisterEvents` – auto-register instance event methods when you construct objects

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