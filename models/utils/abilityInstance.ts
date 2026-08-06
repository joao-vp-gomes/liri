// models/utils/abilityInstance.ts
// "Itemization" of an ability.


import { Ability } from "../ability";


export interface AbilityInstance {
    reference: Ability;
    currentCooldown: number;
    currentDuration: number;
}