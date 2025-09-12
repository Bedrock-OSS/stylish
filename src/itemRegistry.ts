import type { ItemComponentRegistry } from '@minecraft/server';
import { ComponentCtor } from './shared';
import { registerInstanceEventHandlers } from './eventRegistry';

const registry: ComponentCtor[] = [];

/**
 * Decorator – attach to each component class to auto‐register it.
 */
export function ItemComponent<T extends ComponentCtor>(ctor: T) {
    if (!ctor.componentId) {
        throw new Error(`Component ${ctor.name} is missing static componentId`);
    }
    registry.push(ctor);
}

/**
 * Call this in worldInitialize to register all decorated components.
 */
export function registerAllItemComponents(
    itemComponentRegistry: ItemComponentRegistry
) {
    for (const Ctor of registry) {
        const instance = new Ctor();
        // Register any instance event handlers on this object
        registerInstanceEventHandlers(instance);
        itemComponentRegistry.registerCustomComponent(
            Ctor.componentId,
            instance
        );
    }
}
