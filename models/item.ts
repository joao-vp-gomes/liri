import { Entry } from "./entry";
import { Aspect } from "./utils/aspect";
import { Composition } from "./utils/composition";
import { Modifier } from "./utils/modifier";


export type ItemKind = 
    'WEAPON' | 
    'TOOL' |
    'APPAREL' | 
    'ACCESSORY' | 
    'CONSUMABLE' | 
    'MATERIAL' | 
    'ARTIFACT' |
    'CONTAINER';

export class Item extends Entry {

    public kind: ItemKind;
    public stack: number;

    constructor(source?: Partial<Item>) {
        super(source);
        this.category = 'ITEM';

        this.stack = source?.stack ?? 1;
        this.kind = source?.kind ?? 'ARTIFACT';
    }
}

export class Wearable extends Item {

    public traits: Array<Modifier>;

    constructor(source?: Partial<Wearable>) {
        super(source);
        this.traits = source?.traits ? [...source.traits] : new Array();
        this.stack = 1;
    }

}

export class Breakable extends Wearable {

    public compositions: Array<Composition>;
    public durability: number | null;

    constructor(source?: Partial<Breakable>) {
        super(source);
        this.compositions = source?.compositions ? [...source.compositions] : new Array();
        this.durability = source?.durability ?? -1; // -1 = INFINITE DURABILITY
    }

}


export class Weapon extends Breakable {

    public damage: Partial<Aspect>;
    public defense: number;

    constructor(source?: Partial<Weapon>) {
        super(source);
        this.kind = 'WEAPON';
        this.damage = source?.damage ?? {};
        this.defense = source?.defense ?? 0;
    }

}

export class Tool extends Breakable {

    public efficiency: number;

    constructor(source?: Partial<Tool>) {
        super(source);
        this.stack = 1;
        this.kind = 'TOOL';
        this.efficiency = source?.efficiency ?? 0;
    }

}

export class Apparel extends Breakable {

    public resistance: Partial<Aspect>; 
    public protection: Partial<Aspect>; 
    public weight: number;

    constructor(source?: Partial<Apparel>) {
        super(source);
        this.kind = 'APPAREL';
        this.resistance = source?.resistance ?? {}; // Resistance N reduces incoming damage of that type by (N*25)%. 
        this.protection = source?.protection ?? {}; // Protection N reduces incoming damage of that type by N. 
        this.weight = source?.weight ?? 0; 
    }
}

export class Accessory extends Wearable { 

    constructor(source?: Partial<Accessory>) {
        super(source);
        this.kind = 'ACCESSORY';
    }

}

export class Container extends Wearable {

    public size: number;

    constructor(source?: Partial<Container>) {
        super(source);
        this.kind = 'CONTAINER';
        this.size = source?.size ?? 10;
    }

}

export class Consumable extends Item {

    public efficiency: number;

    constructor(source?: Partial<Consumable>) {
        super(source);
        this.kind = 'CONSUMABLE';
        this.efficiency = source?.efficiency ?? 0;
    }

}

export class Material extends Item {

    constructor(source?: Partial<Item>) {
        super(source);
        this.kind = 'MATERIAL';
    }

}

export class Artifact extends Item {
    constructor(source?: Partial<Item>) {
        super(source);
        this.stack = 1;
        this.kind = 'ARTIFACT';
    }
}