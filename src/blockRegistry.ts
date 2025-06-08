import type { BlockComponentRegistry } from '@minecraft/server';
import { ComponentCtor } from './shared';

const registry: ComponentCtor[] = [];

/**
 * Decorator – attach to each component class to auto‐register it.
 */
export function BlockComponent<T extends ComponentCtor>(ctor: T) {
    if (!ctor.componentId) {
        throw new Error(`Component ${ctor.name} is missing static componentId`);
    }
    registry.push(ctor);
}

/**
 * Call this in worldInitialize to register all decorated components.
 */
export function registerAllBlockComponents(
    blockComponentRegistry: BlockComponentRegistry
) {
    for (const Ctor of registry) {
        blockComponentRegistry.registerCustomComponent(
            Ctor.componentId,
            new Ctor()
        );
    }
}
