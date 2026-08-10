// models/utils/itemInstance.ts
// "Itemization" of an item.


import { Breakable, Container, Item } from "../item";
import type { Modifier } from "./modifier";
import { FiniteStorage } from "./storage";


export class ItemInstance {

    public reference: Item;
    public currentStack: number;
    public currentDurability: number | null;
    public quirks: Array<Modifier>;
    public storage: FiniteStorage | null;
    
    constructor(source: ItemInstance | Item) {
        if (source instanceof Item) {
            this.reference = source;
            this.currentStack = 1;
            this.currentDurability = (source instanceof Breakable) ? source?.durability : null;
            this.quirks = new Array<Modifier>();
            this.storage = (source instanceof Container) ? new FiniteStorage(undefined, source.size) : null;
        } else {
            this.reference = source.reference;
            this.currentStack = source.currentStack;
            this.currentDurability = source.currentDurability;
            this.quirks = [...source.quirks];
            this.storage = source.storage ? new FiniteStorage(source.storage) : null;
        }
    }

}