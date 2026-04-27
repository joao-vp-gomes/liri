import { ItemInstance } from "./itemInstance";


const DEFAULT_SIZE = 10;
export class FiniteStorage {

    public slots: Array<ItemInstance | null>;
    public size: number;

    constructor(source?: FiniteStorage, size?: number) {

        this.size = size ?? source?.size ?? DEFAULT_SIZE;

        this.slots = new Array<ItemInstance | null>(this.size).fill(null);
        if (source) {
            source.slots.forEach((slot, i) => {
                if (i < this.size) this.slots[i] = slot ? {...slot} : null; 
                else this.add(slot ? {...slot} : null); 
            });
        }
    }

    add(itemInstanceToAdd: ItemInstance | null): ItemInstance | null {
        if (!itemInstanceToAdd) return null;
        // First try to stack with existing items.
        for (let i = 0; i < this.size; i++) {
            const existingItemInstance = this.slots[i];
            if (
                existingItemInstance &&
                existingItemInstance.reference.key === itemInstanceToAdd.reference.key &&
                existingItemInstance.currentStack < existingItemInstance.reference.stack
            ) {
                itemInstanceToAdd = this.addToSlot(itemInstanceToAdd, i);
                if (!itemInstanceToAdd) return null;
            }
        }
        // Then try to add to empty slots.
        const emptySlot = this.findEmptySlot();
        if (emptySlot !== -1) return this.addToSlot(itemInstanceToAdd, emptySlot);
        
        // If no space left, return the remaining item instance.
        return itemInstanceToAdd;
    }
    addToSlot(itemInstanceToAdd: ItemInstance | null, slot: number, replaceExisting: boolean = false): ItemInstance | null {
        if (!itemInstanceToAdd) return null;
        if (slot < 0 || slot >= this.size) return null;

        const existingItemInstance = this.slots[slot];

        if (!existingItemInstance) {
            const excedingStack = itemInstanceToAdd.currentStack - itemInstanceToAdd.reference.stack;
            if (excedingStack > 0) {
                this.slots[slot] = {...itemInstanceToAdd, currentStack: itemInstanceToAdd.reference.stack};
                return this.add({...itemInstanceToAdd, currentStack: excedingStack});
            }
            this.slots[slot] = itemInstanceToAdd;
            return null;
        }

        if (existingItemInstance.reference.key === itemInstanceToAdd.reference.key) {
            const stackLimit = existingItemInstance.reference.stack;
            const finalStack = existingItemInstance.currentStack + itemInstanceToAdd.currentStack;
            if (finalStack <= stackLimit) {
                existingItemInstance.currentStack = finalStack;
                return null;
            } else {
                existingItemInstance.currentStack = stackLimit;
                itemInstanceToAdd.currentStack = finalStack - stackLimit;
                return this.add(itemInstanceToAdd);
            }
        } else {
            if (!replaceExisting) return itemInstanceToAdd;
            const itemInstanceRemoved = existingItemInstance;
            this.slots[slot] = itemInstanceToAdd;
            return itemInstanceRemoved;
        }
    }

    removeBySlot(slot: number, quantity: number): ItemInstance | null {
        if (slot < 0 || slot >= this.size) return null;

        const existingItemInstance = this.slots[slot];
        if (existingItemInstance === null) return null;
        
        const itemInstanceToRemove = {...existingItemInstance, currentStack: Math.min(quantity, existingItemInstance.currentStack)};
        existingItemInstance.currentStack -= itemInstanceToRemove.currentStack;
        if (existingItemInstance.currentStack <= 0) this.slots[slot] = null;

        return itemInstanceToRemove;
    }
    removeByKey(key: string, quantity: number): ItemInstance | null {
        const slot = this.findSlotByKey(key);
        if (slot === -1) return null;
        return this.removeBySlot(slot, quantity);
    }

    findSlotByKey(key: string): number {
        for (let i = 0; i < this.size; i++) {
            const itemInstance = this.slots[i];
            if (itemInstance && itemInstance.reference.key === key) return i;
        }
        return -1;
    }
    findEmptySlot(): number {
        for (let i = 0; i < this.size; i++) {
            if (!this.slots[i]) return i;
        }
        return -1;
    }

    getLotation(): number {
        let lotation = 0;
        for (let i = 0; i < this.size; i++) {
            if (this.slots[i]) lotation++; 
        }
        return lotation;
    }

}

export class InfiniteStorage {

    public content = new Array<ItemInstance>();

    constructor(source?: InfiniteStorage) {
        source?.content.forEach((item, _i) => this.add(item))
    }

    add(itemInstance: ItemInstance | null): void {
        if (!itemInstance) return;
        // First try to stack with existing items.
        const existing = this.findByKey(itemInstance.reference.key);
        if (existing) {
            existing.currentStack += itemInstance.currentStack;
            return;
        }
        // Then add in a new index.
        this.content.push(itemInstance);
    }

    removeByIndex(index: number, quantity: number): ItemInstance | null {
        if (quantity < 1) return null;
        if (index < 0 || index >= this.content.length) return null;

        const itemInstance = Array.from(this.content)[index];
        const itemInstanceToRemove = {...itemInstance, currentStack: Math.min(quantity, itemInstance.currentStack)};
        itemInstance.currentStack -= itemInstanceToRemove.currentStack;
        if (itemInstance.currentStack <= 0) this.content.splice(index, 1);
        return itemInstanceToRemove;
    }

    findByKey(key: string): ItemInstance | null {
        for (const itemInstance of this.content) {
            if (itemInstance.reference.key === key) return itemInstance;
        }
        return null;
    }

}


