// models/utils/pawnInstance.ts
// "Itemization" of a pawn.


import { Pawn } from "../pawn";
import { ItemInstance } from "./itemInstance";


export class PawnInstance {

    public reference: Pawn;
    public currentHealth: number;
    
    constructor(source: PawnInstance | Pawn) {
        if (source instanceof Pawn) {
            this.reference = source;
            this.currentHealth = source.maxHealth;
        } else {
            this.reference = source.reference;
            this.currentHealth = source.currentHealth;
        }
    }

    die(): Array<ItemInstance> {
        this.currentHealth = 0;

        const drops: Array<ItemInstance> = [];

        this.reference.dropBatches.forEach(batch => {
            if (Math.random() * 100 >= batch.chance) return;

            const totalWeight = batch.drops.reduce((sum, drop) => sum + drop.weight, 0);
            if (totalWeight <= 0) return;

            let roll = Math.random() * totalWeight;
            const chosen = batch.drops.find(drop => (roll -= drop.weight) < 0) ?? batch.drops[batch.drops.length - 1];

            const quantity = chosen.minDropAmount + Math.floor(Math.random() * (chosen.maxDropAmount - chosen.minDropAmount + 1));
            const instance = new ItemInstance(chosen.item);
            instance.currentStack = quantity;
            drops.push(instance);
        });

        return drops;
    }

}