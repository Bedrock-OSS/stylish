import type { BlockComponentRegistry } from '@minecraft/server';
import { ComponentCtor } from './shared';
import { registerInstanceEventHandlers } from './eventRegistry';

const registry: ComponentCtor[] = [];

/**
 * Decorator - attach to each component class to auto-register it.
 */
export function BlockComponent<T extends ComponentCtor>(ctor: T) {
    if (!ctor.componentId) {
        throw new Error(`Component ${ctor.name} is missing static componentId`);
    }
    registry.push(ctor);
}

/**
 * Number of decorated block components awaiting registration.
 * @internal
 */
export function blockComponentCount() {
    return registry.length;
}

/**
 * Call this in worldInitialize to register all decorated components.
 */
export function registerAllBlockComponents(
    blockComponentRegistry: BlockComponentRegistry
) {
    for (const Ctor of registry) {
        // A block whose JSON lists a flattened custom component fails to parse
        // entirely when that component is missing - the block then does not exist
        // in the world. One broken component must never take the others down.
        try {
            const instance = new Ctor();
            // Register any instance event handlers on this object
            registerInstanceEventHandlers(instance);
            blockComponentRegistry.registerCustomComponent(
                Ctor.componentId,
                instance
            );
        } catch (e) {
            LOGGING: console.error(
                `Failed to register block component '${Ctor.componentId}':`,
                e
            );
        }
    }
}
