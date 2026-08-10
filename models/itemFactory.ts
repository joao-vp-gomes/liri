// models/itemFactory.ts


import { Item, Weapon, Tool, Apparel, Accessory, Container, Consumable, Material, Artifact, type ItemKind } from "./item";


export class ItemFactory {

    private static registry = {
        'WEAPON': Weapon,
        'TOOL': Tool,
        'APPAREL': Apparel,
        'ACCESSORY': Accessory,
        'CONTAINER': Container,
        'CONSUMABLE': Consumable,
        'MATERIAL': Material,
        'ARTIFACT': Artifact,
    };

    public static instantiate(data: any): Item {
        const kind = data?.['kind'] as ItemKind;
        return this.instantiateAs(kind, data);
    }

    public static instantiateAs(kind: ItemKind, data: Partial<Item>): Item {
        const TargetClass = this.registry[kind] || Artifact;
        return new TargetClass(data);
    }

}
