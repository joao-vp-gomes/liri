// frontend/src/utils/transfer.ts


import { dbFetch, dbRegister } from '../services/database';
import { Character } from '../../../models/character.ts';
import type { ItemInstance } from '../../../models/utils/itemInstance.ts';


export async function transfer(toKey: string, item: ItemInstance): Promise<boolean> {
    const to = await dbFetch(`entries/${toKey}`);
    if (!(to instanceof Character)) return false;
    to.inventory.environmentToPocket(item);
    return dbRegister(`entries/${toKey}`, to);
}


export default transfer;
