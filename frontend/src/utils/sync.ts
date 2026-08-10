// frontend/src/utils/sync.ts


import { dbFetch, dbRegister } from '../services/database';
import { Character } from '../../../models/character.ts';
import type { ItemInstance } from '../../../models/utils/itemInstance.ts';
import type { AbilityInstance } from '../../../models/utils/abilityInstance.ts';


const EQUIPMENT_FIELDS = ['apparel', 'rightHand', 'leftHand', 'accessory1', 'accessory2', 'container'] as const;

const refreshItem = async (inst: ItemInstance | null): Promise<ItemInstance | null> => {
    if (!inst) return null;
    const fresh = await dbFetch(`entries/${inst.reference.key}`);
    if (!fresh) return null;
    inst.reference = fresh;
    return inst;
};

export async function sync(character: Character): Promise<Character> {

    for (let i = 0; i < character.inventory.pocket.slots.length; i++) {
        character.inventory.pocket.slots[i] = await refreshItem(character.inventory.pocket.slots[i]);
    }

    const equipment = character.inventory.equipment as unknown as Record<string, ItemInstance | null>;
    for (const field of EQUIPMENT_FIELDS) {
        equipment[field] = await refreshItem(equipment[field]);
    }

    const containerStorage = character.inventory.equipment.container?.storage ?? null;
    if (containerStorage) {
        for (let i = 0; i < containerStorage.slots.length; i++) {
            containerStorage.slots[i] = await refreshItem(containerStorage.slots[i]);
        }
    }

    for (let i = character.inventory.vault.content.length - 1; i >= 0; i--) {
        const refreshed = await refreshItem(character.inventory.vault.content[i]);
        if (!refreshed) character.inventory.vault.content.splice(i, 1);
    }

    for (let i = character.inventory.workbench.content.length - 1; i >= 0; i--) {
        const refreshed = await refreshItem(character.inventory.workbench.content[i]);
        if (!refreshed) character.inventory.workbench.content.splice(i, 1);
    }

    for (let i = 0; i < character.grimmoire.slots.length; i++) {
        const inst = character.grimmoire.slots[i] as AbilityInstance | null;
        if (!inst) continue;
        const fresh = await dbFetch(`entries/${inst.reference.key}`);
        character.grimmoire.slots[i] = fresh ? { ...inst, reference: fresh } : null;
    }

    await dbRegister(`entries/${character.key}`, character);
    return character;

}


export default sync;
