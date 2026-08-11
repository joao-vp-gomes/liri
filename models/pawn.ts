// models/pawn.ts


import { Entry } from "./entry";
import { type Aspect } from "./utils/aspect";
import { type AttributesConstellation, DEFAULT_ATTRIBUTES_CONSTELLATION } from "./utils/attributesConstellation";
import { ItemInstance } from "./utils/itemInstance";


export type PawnKind = 'MULTIPLE' | 'UNIQUE';

export interface Action {
    name: string,
    description: string
}

export interface Drop {
    weight: number, // Number greater than 0. The higher it is, the more likely the drop is to be picked if its batch drops.
    minDropAmount: number,
    maxDropAmount: number,
    item: ItemInstance
}

export interface DropBatch {
    chance: number, // Number between 0 and 100. It is the chance of dropping. If so, only one of the items in the batch is picked at random to be dropped.
    drops: Array<Drop>
}

export class Pawn extends Entry {

    public kind: PawnKind;

    public actions: Array<Action>;
    public maxHealth: number;
    public movement: number;
    public range: number;
    public protections: Partial<Aspect>;
    public resistances: Partial<Aspect>;
    public constellation: AttributesConstellation;
    public dropBatches: Array<DropBatch>;

    constructor(source?: Partial<Pawn>) {
        super(source);
        this.category = 'PAWN';

        this.kind = source?.kind ?? 'UNIQUE';
        this.actions = source?.actions ? [...source.actions] : new Array();
        this.maxHealth = source?.maxHealth ?? 0;
        this.movement = source?.movement ?? 0;
        this.range = source?.range ?? 0;
        this.constellation = source?.constellation ?? {...DEFAULT_ATTRIBUTES_CONSTELLATION};
        this.protections = source?.protections ?? {};
        this.resistances = source?.resistances ?? {};
        this.dropBatches = source?.dropBatches ? [...source.dropBatches] : new Array();
    }

}