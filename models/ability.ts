// models/ability.ts


import { Entry } from "./entry";
import { Competence } from "./utils/competence";
import { StatsCondition } from "./utils/statsCondition";


export class Ability extends Entry {

    public cooldown: number; 
    // Time in turns. 0 means instantaneos, -1 means infinite.
    public duration: number; 

    public startCost: Partial<StatsCondition> | null;
    public durationCost: Partial<StatsCondition> | null;
    public finishCost: Partial<StatsCondition> | null;
    public competence: Competence | null;

    constructor(source?: Partial<Ability>) {
        super(source);
        this.category = 'ABILITY';

        this.cooldown = source?.cooldown ?? 0;
        this.duration = source?.duration ?? 0;
        this.startCost = source?.startCost ?? null;
        this.durationCost = source?.durationCost ?? null;
        this.finishCost = source?.finishCost ?? null;
        this.competence = source?.competence ?? null;
    }

}