import { BindThis } from "../src/autobind";

describe("BindThis", () => {
  class TestClass {
    value = 42;
    @BindThis
    getValue() {
      return this.value;
    }
  }

  test("binds method to instance", () => {
    const obj = new TestClass();
    const fn = obj.getValue;
    expect(fn()).toBe(42);
  });

  test("replaces getter with bound function", () => {
    const obj = new TestClass();
    const first = obj.getValue;
    const second = obj.getValue;
    expect(first).toBe(second);
    expect(Object.prototype.hasOwnProperty.call(obj, "getValue")).toBe(true);
    expect(first).not.toBe(TestClass.prototype.getValue);
  });
});
