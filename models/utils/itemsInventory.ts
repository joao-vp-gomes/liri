// models/utils/itemsInventory.ts


import { ItemInstance } from "./itemInstance";
import { Equipment } from "./equipment";
import { FiniteStorage, InfiniteStorage } from "./storage";
import { Breakable } from "../item";


const POCKET_SIZE = 12;

export type SourceLocation =
    | { type: 'pocket'; slot: number }
    | { type: 'container'; slot: number }
    | { type: 'equipment'; slot: keyof typeof Equipment.EQUIPMENT_SLOTS };

export const sameLocation = (a: SourceLocation | null, b: SourceLocation | null): boolean =>
    !!a && !!b && a.type === b.type && a.slot === b.slot;

export class ItemsInventory {

    public pocket: FiniteStorage;
    public vault: InfiniteStorage;
    public equipment: Equipment;

    constructor(source?: ItemsInventory) {
        this.pocket = new FiniteStorage(source?.pocket, POCKET_SIZE);
        this.vault = source?.vault ? new InfiniteStorage(source.vault) : new InfiniteStorage();
        this.equipment = source?.equipment ? new Equipment(source.equipment) : new Equipment();
    }

    peekAtLocation(location: SourceLocation): ItemInstance | null {
        if (location.type === 'pocket') return this.pocket.slots[location.slot] ?? null;
        if (location.type === 'container') return this.equipment.container?.storage?.slots[location.slot] ?? null;
        return this.equipment.getEquipment(location.slot);
    }

    removeFromLocation(location: SourceLocation, quantity: number): ItemInstance | null {
        if (location.type === 'pocket') return this.pocket.removeBySlot(location.slot, quantity);
        if (location.type === 'container') {
            const container = this.equipment.container?.storage ?? null;
            return container ? container.removeBySlot(location.slot, quantity) : null;
        }
        return this.equipment.clearEquipment(location.slot);
    }

    craftFromLocations(consumptions: Array<{ location: SourceLocation; quantity: number }>, products: Array<ItemInstance>): void {
        consumptions.forEach(consumption => this.removeFromLocation(consumption.location, consumption.quantity));
        products.forEach(product => this.environmentToPocket(new ItemInstance(product)));
    }

    repairAtLocation(itemLocation: SourceLocation, materialLocation: SourceLocation, repairFactor: number): void {
        const itemInstance = this.peekAtLocation(itemLocation);
        if (!itemInstance || itemInstance.currentDurability === null) return;
        if (!(itemInstance.reference instanceof Breakable)) return;
        const maxDurability = itemInstance.reference.durability;
        if (maxDurability === null || maxDurability === -1) return;

        itemInstance.currentDurability = Math.min(maxDurability, itemInstance.currentDurability + repairFactor);
        this.removeFromLocation(materialLocation, 1);
    }

    environmentToPocket(itemToAdd: ItemInstance, slot?: number): void {
        if (slot !== undefined) {
            let excedent = this.pocket.addToSlot(itemToAdd, slot, true);
            if (excedent) excedent = this.pocket.add(excedent);
            if (excedent) this.vault.add(excedent);
        }
        else {
            let excedent = this.pocket.add(itemToAdd);
            this.vault.add(excedent);
        }
    }
    pocketToEnvironment(slot: number, quantity: number): void {
        this.pocket.removeBySlot(slot, quantity);
    }
    environmentToContainer(itemToAdd: ItemInstance, slot?: number): void {
        const containerSlot = this.equipment.container;
        if (containerSlot === null) return;
        const container = containerSlot.storage;
        if (container === null) return;

        if (slot !== undefined) {
            let excedent = container.addToSlot(itemToAdd, slot, true);
            if (excedent) excedent = container.add(excedent);
            if (excedent) this.vault.add(excedent);
        }
        else {
            let excedent = container.add(itemToAdd);
            this.vault.add(excedent);
        }
    }
    containerToEnvironment(slot: number, quantity: number): void {
        const containerSlot = this.equipment.container;
        if (containerSlot === null) return;
        const container = containerSlot.storage;
        if (container === null) return;

        container.removeBySlot(slot, quantity);
    }

    pocketToStorage(slot: number, quantity: number): void {
        this.vault.add(this.pocket.removeBySlot(slot, quantity));
    }
    storageToPocket(index: number, quantity: number): void {
        const excedent = this.pocket.add(this.vault.removeByIndex(index, quantity));
        if (excedent) this.vault.add(excedent);
    }
    containerToStorage(slot: number, quantity: number): void {
        const containerSlot = this.equipment.container;
        if (containerSlot === null) return;
        const container = containerSlot.storage;
        if (container === null) return;

        this.vault.add(container.removeBySlot(slot, quantity));
    }
    storageToContainer(index: number, quantity: number): void {
        const containerSlot = this.equipment.container;
        if (containerSlot === null) return;
        const container = containerSlot.storage;
        if (container === null) return;

        const excedent = container.add(this.vault.removeByIndex(index, quantity));
        if (excedent) this.vault.add(excedent);
    }
    storageToEnvironment(index: number, quantity: number): void {
        this.vault.removeByIndex(index, quantity);
    }

    pocketToEquipment(slot: number, equipmentSlot: keyof typeof Equipment.EQUIPMENT_SLOTS): void {
        const excedent = this.equipment.setEquipment(equipmentSlot, this.pocket.removeBySlot(slot, 1));
        if (excedent) this.pocket.addToSlot(excedent, slot);
    }
    equipmentToPocket(equipmentSlot: keyof typeof Equipment.EQUIPMENT_SLOTS): void {
        const excedent = this.pocket.add(this.equipment.clearEquipment(equipmentSlot));
        if (excedent) this.equipment.setEquipment(equipmentSlot, excedent);
    }
    containerToEquipment(slot: number, equipmentSlot: keyof typeof Equipment.EQUIPMENT_SLOTS): void {
        const containerSlot = this.equipment.container;
        if (containerSlot === null) return;
        const container = containerSlot.storage;
        if (container === null) return;

        const excedent = this.equipment.setEquipment(equipmentSlot, container.removeBySlot(slot, 1));
        if (excedent) container.addToSlot(excedent, slot);
    }
    equipmentToContainer(equipmentSlot: keyof typeof Equipment.EQUIPMENT_SLOTS): void {
        if (equipmentSlot === 'CONTAINER') return; // Prevent a container from being placed inside itself.

        const containerSlot = this.equipment.container;
        if (containerSlot === null) return;
        const container = containerSlot.storage;
        if (container === null) return;

        const excedent = container.add(this.equipment.clearEquipment(equipmentSlot));
        if (excedent) this.equipment.setEquipment(equipmentSlot, excedent);
    }
    equipmentToEnvironment(equipmentSlot: keyof typeof Equipment.EQUIPMENT_SLOTS): void {
        this.equipment.clearEquipment(equipmentSlot);
    }

    containerToPocket(fromSlot: number, toSlot: number): void {
        const containerSlot = this.equipment.container;
        if (containerSlot === null) return;
        const container = containerSlot.storage;
        if (container === null) return;

        if (fromSlot < 0 || fromSlot >= container.size) return;
        if (toSlot < 0 || toSlot >= this.pocket.size) return;

        [container.slots[fromSlot], this.pocket.slots[toSlot]] = [this.pocket.slots[toSlot], container.slots[fromSlot]];
    }
    pocketToContainer(fromSlot: number, toSlot: number): void {
        const containerSlot = this.equipment.container;
        if (containerSlot === null) return;
        const container = containerSlot.storage;
        if (container === null) return;

        if (fromSlot < 0 || fromSlot >= this.pocket.size) return;
        if (toSlot < 0 || toSlot >= container.size) return;

        [this.pocket.slots[fromSlot], container.slots[toSlot]] = [container.slots[toSlot], this.pocket.slots[fromSlot]];
    }

}