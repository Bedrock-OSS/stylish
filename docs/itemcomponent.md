# `ItemComponent`

The `ItemComponent` decorator marks a custom item component class for automatic
registration. Each decorated class must declare a static `componentId` property
containing the identifier used by the Minecraft Script API.

## Example

```ts
import { ItemComponent } from '@bedrock-oss/stylish';

@ItemComponent
class CooldownComponent {
  static componentId = 'example:cooldown';
  // component data and behaviour
}
```

When `init()` runs, every class decorated with `ItemComponent` will be
registered with the appropriate `ItemComponentRegistry`.