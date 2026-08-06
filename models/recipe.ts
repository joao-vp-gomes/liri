// models/recipe.ts
// WORKING ON IT


import { ItemInstance } from "./utils/itemInstance";
import { Entry } from "./entry";
import { Ingredient } from "./utils/ingredient";
import { Competence } from "./utils/competence";


export type RecipeKind = 'CRAFTING' | 'SMITHING' | 'ALCHEMY' | 'ENCHANTING' | 'COOKING';
export class Recipe extends Entry {
    
    public kind: RecipeKind; // Only for indexing.
    public ingredients: Array<Ingredient>;
    // Certain recipes require certain competences to be performed.
    public competence: Competence | null;
    public product: ItemInstance | null;

    constructor(source?: Partial<Recipe>) {
        super(source);
        this.category = 'RECIPE';

        this.kind = source?.kind ?? 'CRAFTING';
        this.ingredients = source?.ingredients ? [...source.ingredients] : new Array();
        this.competence = source?.competence ?? null;
        this.product = source?.product ?? null;
    }

}