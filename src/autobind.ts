/**
 * Decorator – binds the method to the instance
 * Equivalent to calling `this.method = this.method.bind(this);`
 */
export function BindThis(
    _target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
): PropertyDescriptor {
    const original = descriptor.value;
    return {
        configurable: true,
        enumerable: descriptor.enumerable,
        get(): any {
            // bind once
            const bound = original.bind(this);
            // overwrite the property on the instance so future accesses hit the bound fn directly
            Object.defineProperty(this, propertyKey, {
                value: bound,
                configurable: true,
                writable: true,
                enumerable: false,
            });
            return bound;
        },
    };
}