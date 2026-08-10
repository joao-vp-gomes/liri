// models/ability.ts


import { Entry } from "./entry";
import { type Competence } from "./utils/competence";
import { type StatsCondition } from "./utils/statsCondition";
import { type Modifier } from "./utils/modifier.ts";


export class Ability extends Entry {

    public cooldown: number; 
    // Time in turns. 0 means instantaneos, -1 means infinite.
    public duration: number; 
    public actionType: 'PRIMARY_ACTION' | 'SECONDARY_ACTION' | 'REACTION';
    public startCost: Partial<StatsCondition> | null;
    public durationCost: Partial<StatsCondition> | null;
    public finishCost: Partial<StatsCondition> | null;
    public competences: Array<Competence>;

    public traits: Array<Modifier>;

    constructor(source?: Partial<Ability>) {
        super(source);
        this.category = 'ABILITY';

        this.cooldown = source?.cooldown ?? 0;
        this.duration = source?.duration ?? 0;
        this.actionType = source?.actionType ?? 'PRIMARY_ACTION';
        this.startCost = source?.startCost ?? null;
        this.durationCost = source?.durationCost ?? null;
        this.finishCost = source?.finishCost ?? null;
        this.competences = source?.competences ? [...source.competences] : new Array();

        this.traits = source?.traits ? [...source.traits] : new Array();
    }

}