import type { ItemComponentRegistry } from '@minecraft/server';
import { ComponentCtor } from './shared';

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
        itemComponentRegistry.registerCustomComponent(
            Ctor.componentId,
            new Ctor()
        );
    }
}
