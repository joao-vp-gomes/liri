// models/utils/equipment.ts


import { ItemInstance } from "./itemInstance";


export class Equipment {

    public apparel: ItemInstance | null;
    public rightHand: ItemInstance | null;
    public leftHand: ItemInstance | null;
    public accessory1: ItemInstance | null;
    public accessory2: ItemInstance | null;
    public container: ItemInstance | null;

    static EQUIPMENT_SLOTS = {
        'APPAREL': ['APPAREL'],
        'RIGHT_HAND': ['WEAPON', 'TOOL'],
        'LEFT_HAND': ['WEAPON', 'TOOL'],
        'ACCESSORY_1': ['ACCESSORY'],
        'ACCESSORY_2': ['ACCESSORY'],
        'CONTAINER': ['CONTAINER']
     } as const;

    constructor(source?: Equipment) {
        this.apparel = source?.apparel ? {...source.apparel} : null;
        this.rightHand = source?.rightHand ? {...source.rightHand} : null;
        this.leftHand = source?.leftHand ? {...source.leftHand} : null;
        this.accessory1 = source?.accessory1 ? {...source.accessory1} : null;
        this.accessory2 = source?.accessory2 ? {...source.accessory2} : null;
        this.container = source?.container ? {...source.container} : null;
    }

    setEquipment(slot: keyof typeof Equipment.EQUIPMENT_SLOTS, itemInstance: ItemInstance | null): ItemInstance | null {
        if(!itemInstance) return null;
        if (!(Equipment.EQUIPMENT_SLOTS[slot] as readonly string[]).includes(itemInstance.reference.kind)) return itemInstance;
        
        let removed: ItemInstance | null = null;
        switch (slot) {
            case 'APPAREL': removed = this.apparel; this.apparel = itemInstance ? {...itemInstance} : null; break;
            case 'RIGHT_HAND': removed = this.rightHand; this.rightHand = itemInstance ? {...itemInstance} : null; break;
            case 'LEFT_HAND': removed = this.leftHand; this.leftHand = itemInstance ? {...itemInstance} : null; break;
            case 'ACCESSORY_1': removed = this.accessory1; this.accessory1 = itemInstance ? {...itemInstance} : null; break;
            case 'ACCESSORY_2': removed = this.accessory2; this.accessory2 = itemInstance ? {...itemInstance} : null; break;
            case 'CONTAINER': removed = this.container; this.container = itemInstance ? {...itemInstance} : null; break;
            default: break;
        }
        return removed;
    }

    clearEquipment(slot: keyof typeof Equipment.EQUIPMENT_SLOTS): ItemInstance | null {
        let removed: ItemInstance | null = null;
        switch (slot) {
            case 'APPAREL': removed = this.apparel; this.apparel = null; break;
            case 'RIGHT_HAND': removed = this.rightHand; this.rightHand = null; break;
            case 'LEFT_HAND': removed = this.leftHand; this.leftHand = null; break;
            case 'ACCESSORY_1': removed = this.accessory1; this.accessory1 = null; break;
            case 'ACCESSORY_2': removed = this.accessory2; this.accessory2 = null; break;
            case 'CONTAINER': removed = this.container; this.container = null; break;
            default: break;
        }
        return removed;
    }

}
