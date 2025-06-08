# stylish

[![npm version](https://badge.fury.io/js/@bedrock-oss%2Fstylish.svg)](https://badge.fury.io/js/@bedrock-oss%2Fstylish)

Stylish is a decorator library aimed at simplifying development for the Minecraft Bedrock Script API. It focuses on automatic registration of custom components and convenience helpers for method binding.

## Features

- `@ItemComponent` – automatically registers a custom item component.
- `@BlockComponent` – automatically registers a custom block component.
- `@BindThis` – binds a method to its instance when accessed.

## Installation

1. Install the package:

```bash
npm install @bedrock-oss/stylish
```
2. Enable decorators in your `tsconfig.json`:

```jsonc
{
  "compilerOptions": {
    "experimentalDecorators": true
  }
}
```

## Usage

Register a custom item component:

ExampleComponent.ts:
```ts
import { ItemComponentUseEvent } from '@minecraft/server';
import { ItemComponent, BindThis } from '@bedrock-oss/stylish';

@ItemComponent
class ExampleComponent {
  static componentId = 'example:component';
  message = 'Hello world!';

  @BindThis
  onUse(event: ItemComponentUseEvent) {
    event.source.sendMessage(this.message);
  }
}
```

main.ts:
```ts
import { initV1 } from '@bedrock-oss/stylish';
export * from './ExampleComponent';

initV1(); // Registers all decorated components on world load
// Replace with initV2() when using Script API v2
// Alternatively, you can register your own event handler and call registerAllComponents()

```

> [!IMPORTANT]  
> When splitting components into multiple files, remember to import/export the file containing the component class.

## Documentation

See the [`docs`](docs/) folder for details on decorators:

- [BindThis](docs/bindthis.md)
- [ItemComponent](docs/itemcomponent.md)
- [BlockComponent](docs/blockcomponent.md)


## Contributing

Feel free to raise an issue or submit a pull request if you have any improvements or features to suggest.

## License

This project is licensed under the MIT License.
