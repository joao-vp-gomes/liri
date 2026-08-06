// models/utils/abilitiesGrimmoire.ts


import { AbilityInstance } from './abilityInstance'


const GRIMMOIRE_SIZE = 6;
export class AbilitiesGrimmoire {

    public slots: Array<AbilityInstance | null>;

    constructor(source?: AbilitiesGrimmoire) {
        this.slots = new Array<AbilityInstance | null>(GRIMMOIRE_SIZE).fill(null);
        if (source) {
            source.slots.forEach((slot, i) => {
                if (i < GRIMMOIRE_SIZE) this.slots[i] = slot ? {...slot} : null; 
                else this.add(slot ? {...slot} : null); 
            });
        }
    }

    add(ability: AbilityInstance | null): AbilityInstance | null {
        if (!ability) return null;

        const emptySlot = this.findEmptySlot();
        if (emptySlot !== -1) return this.addToSlot(ability, emptySlot);
        
        return ability;
    }
    addToSlot(ability: AbilityInstance | null, slot: number, replaceExisting: boolean = false): AbilityInstance | null {
        if (!ability) return null;
        if (slot < 0 || slot >= GRIMMOIRE_SIZE) return null;

        const existingAbility = this.slots[slot];
        if (existingAbility) {
            if (replaceExisting) {
                this.slots[slot] = ability;
                return existingAbility;
            }
            else return ability;
        }
        else {
            this.slots[slot] = ability;
            return null;
        }

    }

    removeBySlot(slot: number): AbilityInstance | null {
        if (slot < 0 || slot >= GRIMMOIRE_SIZE) return null;

        const abilityToRemove = this.slots[slot];
        this.slots[slot] = null; 
        return abilityToRemove;
    }

    findEmptySlot(): number {
        for (let i = 0; i < GRIMMOIRE_SIZE; i++) {
            if (!this.slots[i]) return i;
        }
        return -1;
    }

}