# `BindThis`

`BindThis` is a method decorator that binds the decorated method to its class instance. It is
similar to manually calling `this.method = this.method.bind(this)` in the constructor.

## Example

```ts
import { BindThis } from '@bedrock-oss/stylish';

class Example {
  @BindThis
  onTick() {
    console.log(this); // always refers to the instance
  }
}

const e = new Example();
const cb = e.onTick;
cb(); // prints the instance even when called as a callback
```

Use it whenever a callback is passed to the Minecraft Script API so that the value of
`this` remains stable.