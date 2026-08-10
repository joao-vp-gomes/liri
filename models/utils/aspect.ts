// models/utils/aspect.ts
// Aspects represent the different types of damage and resistance in the game.


export interface Aspect {
    slash: number;
    pierce: number;
    bludgeon: number;

    arcane: number;

    wither: number;
    delirium: number;
    taint: number;
    poison: number;

    pure: number;
}