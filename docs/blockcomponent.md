# `BlockComponent`

`BlockComponent` works the same as `ItemComponent` but for block components. Decorate
any custom block component class that exposes a static `componentId`.

## Example

```ts
import { BlockComponent } from '@bedrock-oss/stylish';

@BlockComponent
class ShapeComponent {
  static componentId = 'example:shape';
}
```

Decorated classes will be registered with the `BlockComponentRegistry` when
`init()` executes.