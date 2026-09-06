import { BlockComponentRegistry, ItemComponentRegistry, StartupEvent, system } from "@minecraft/server";
import { itemComponentCount, registerAllItemComponents } from "./itemRegistry";
import { blockComponentCount, registerAllBlockComponents } from "./blockRegistry";
import { triggerStartupEvent } from "./eventRegistry";
import { customCommandCount, registerAllCustomCommands } from "./customCommandRegistry";

export { BindThis } from "./autobind";
export { ItemComponent } from "./itemRegistry";
export { BlockComponent } from "./blockRegistry";
export { Interval, Timeout, OnTick } from "./scheduler";
export { WorldProperty, invalidateWorldProperty } from "./dynamicProperty";
export type { WorldPropertyOptions } from "./dynamicProperty";
export {
    RegisterEvents,
    createEventDecorator,
    registerInstanceEventHandlers,
    setEventDebugLogging,
    ScriptEvent,
    // System events
    OnStartup,
    OnBeforeShutdown,
    OnScriptEventReceive,
    // World after events
    OnBlockContainerClosed,
    OnBlockContainerOpened,
    OnBlockExplode,
    OnButtonPush,
    OnDataDrivenEntityTrigger,
    OnEffectAdd,
    OnEntityContainerClosed,
    OnEntityContainerOpened,
    OnEntityDie,
    OnEntityHeal,
    OnEntityHealthChanged,
    OnEntityHitBlock,
    OnEntityHitEntity,
    OnEntityHurt,
    OnEntityItemDrop,
    OnEntityItemPickup,
    OnEntityLoad,
    OnEntityRemove,
    OnEntitySpawn,
    OnEntityUpgrade,
    OnExplosion,
    OnGameRuleChange,
    OnItemCompleteUse,
    OnItemReleaseUse,
    OnItemStartUse,
    OnItemStartUseOn,
    OnItemStopUse,
    OnItemStopUseOn,
    OnItemUse,
    OnLeverAction,
    OnPistonActivate,
    OnPlayerBreakBlock,
    OnPlayerButtonInput,
    OnPlayerDimensionChange,
    OnPlayerEmote,
    OnPlayerGameModeChange,
    OnPlayerHotbarSelectedSlotChange,
    OnPlayerInputModeChange,
    OnPlayerInputPermissionCategoryChange,
    OnPlayerInteractWithBlock,
    OnPlayerInteractWithEntity,
    OnPlayerInventoryItemChange,
    OnPlayerJoin,
    OnPlayerLeave,
    OnPlayerPlaceBlock,
    OnPlayerSpawn,
    OnPlayerSwingStart,
    OnPressurePlatePop,
    OnPressurePlatePush,
    OnProjectileHitBlock,
    OnProjectileHitEntity,
    OnTargetBlockHit,
    OnTripWireTrip,
    OnWeatherChange,
    OnWorldLoad,
    // World before events
    OnBeforeEffectAdd,
    OnBeforeEntityHeal,
    OnBeforeEntityHurt,
    OnBeforeEntityItemPickup,
    OnBeforeEntityRemove,
    OnBeforeExplosion,
    OnBeforeItemUse,
    OnBeforePlayerBreakBlock,
    OnBeforePlayerGameModeChange,
    OnBeforePlayerInteractWithBlock,
    OnBeforePlayerInteractWithEntity,
    OnBeforePlayerLeave,
    OnBeforeWeatherChange,
} from "./eventRegistry";
export type { EventMap, EventOptionsMap, EventDecorator } from "./eventRegistry";
export { CustomCmd } from "./customCommandRegistry";

/**
 * Initializes the library
 */
export function init() {
    system.beforeEvents.startup.subscribe((e: StartupEvent) => {
        // The registry properties on the event are native accessors - only
        // touch the ones that actually have decorated registrations.
        // Blocks go first: a block JSON listing a flattened custom component fails
        // to parse when that component is missing, so an unregistered block component
        // costs a whole block, while items and commands only get a warning.
        const sections: [() => number, () => void, string][] = [
            [blockComponentCount, () => registerAllBlockComponents(e.blockComponentRegistry), "block components"],
            [itemComponentCount, () => registerAllItemComponents(e.itemComponentRegistry), "item components"],
            [customCommandCount, () => registerAllCustomCommands(e.customCommandRegistry), "custom commands"],
        ];
        for (const [count, register, label] of sections) {
            if (count() === 0) continue;
            try {
                register();
            } catch (err) {
                LOGGING: console.error(`Failed to register ${label}:`, err);
            }
        }
        triggerStartupEvent(e);
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
