import { BlockComponentRegistry, ItemComponentRegistry, StartupEvent, system, world, WorldLoadAfterEvent } from "@minecraft/server";
import { registerAllItemComponents } from "./itemRegistry";
import { registerAllBlockComponents } from "./blockRegistry";
import { triggerStartupEvent, triggerWorldLoadEvent } from "./eventRegistry";

export { BindThis } from "./autobind";
export { ItemComponent } from "./itemRegistry";
export { BlockComponent } from "./blockRegistry";
export { OnStartup, OnBeforeItemUse, OnWorldLoad, RegisterEvents, createEventDecorator } from "./eventRegistry";

/**
 * Initializes the library
 */
export function init() {
    system.beforeEvents.startup.subscribe((e: StartupEvent) => {
        registerAllComponents(e.itemComponentRegistry, e.blockComponentRegistry);
        triggerStartupEvent(e);
    });
    world.afterEvents.worldLoad.subscribe((e: WorldLoadAfterEvent) => {
        triggerWorldLoadEvent(e);
    });
}

/**
 * Registers V1 `worldInitialize` event and registers all components.
 * @deprecated Use {@link init() `init()`} instead. **Please note that Minecraft Script API v1.X is no longer supported and this will initialize for Minecraft Script API V2.X and later!**
 */
export function initV1() {
    init();
}

/**
 * Registers V1 `worldInitialize` event and registers all components.
 * @deprecated Use {@link init() `init()`} instead.
 */
export function initV2() {
    init();
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
