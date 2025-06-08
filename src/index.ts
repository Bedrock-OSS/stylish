import { BlockComponentRegistry, ItemComponentRegistry, system, world } from "@minecraft/server";
import { registerAllItemComponents } from "./itemRegistry";
import { registerAllBlockComponents } from "./blockRegistry";

export { BindThis } from "./autobind";
export { ItemComponent } from "./itemRegistry";
export { BlockComponent } from "./blockRegistry";

/**
 * Registers V1 `worldInitialize` event and registers all components.
 */
export function initV1() {
    world.beforeEvents.worldInitialize.subscribe((e) => {
        registerAllComponents(e.itemComponentRegistry, e.blockComponentRegistry);
    });
}

/**
 * Registers V2 `startup` event and registers all components.
 */
export function initV2() {
    (system as any).beforeEvents.startup.subscribe((e: any) => {
        registerAllComponents(e.itemComponentRegistry, e.blockComponentRegistry);
    });
}

/**
 * Registers all components.
 * @param itemRegistry Item component registry
 * @param blockRegistry Block component registry
 */
export function registerAllComponents(itemRegistry: ItemComponentRegistry, blockRegistry: BlockComponentRegistry) {
    registerAllItemComponents(itemRegistry);
    registerAllBlockComponents(blockRegistry);
}