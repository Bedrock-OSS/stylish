describe("ItemComponent decorator", () => {
  test("registers decorated classes", async () => {
    const mod = await import("../src/itemRegistry");
    const { ItemComponent, registerAllItemComponents } = mod;

    @ItemComponent
    class Foo {
      static componentId = "foo:component";
    }

    const registry = { registerCustomComponent: jest.fn() } as any;
    registerAllItemComponents(registry);
    expect(registry.registerCustomComponent).toHaveBeenCalledTimes(1);
    expect(registry.registerCustomComponent).toHaveBeenCalledWith(
      "foo:component",
      expect.any(Foo)
    );
  });

  test("throws when componentId missing", async () => {
    const mod = await import("../src/itemRegistry");
    const { ItemComponent } = mod;

    class Bad {}
    expect(() => ItemComponent(Bad as any)).toThrow(
      "Component Bad is missing static componentId"
    );
  });
});

describe("BlockComponent decorator", () => {
  test("registers decorated classes", async () => {
    const mod = await import("../src/blockRegistry");
    const { BlockComponent, registerAllBlockComponents } = mod;

    @BlockComponent
    class FooBlock {
      static componentId = "foo:block";
    }

    const registry = { registerCustomComponent: jest.fn() } as any;
    registerAllBlockComponents(registry);
    expect(registry.registerCustomComponent).toHaveBeenCalledTimes(1);
    expect(registry.registerCustomComponent).toHaveBeenCalledWith(
      "foo:block",
      expect.any(FooBlock)
    );
  });

  test("throws when componentId missing", async () => {
    const mod = await import("../src/blockRegistry");
    const { BlockComponent } = mod;

    class Bad {}
    expect(() => BlockComponent(Bad as any)).toThrow(
      "Component Bad is missing static componentId"
    );
  });
});
