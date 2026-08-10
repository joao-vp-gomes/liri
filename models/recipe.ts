// models/recipe.ts


import type { ItemInstance } from "./utils/itemInstance";
import { Entry } from "./entry";
import type { Ingredient } from "./utils/ingredient";
import type { Competence } from "./utils/competence";


export type RecipeKind = 'CRAFTING' | 'SMITHING' | 'ALCHEMY' | 'ENCHANTING' | 'COOKING';
export class Recipe extends Entry {
    
    public kind: RecipeKind; // Only for indexing.
    public ingredients: Array<Ingredient>;
    // Certain recipes require certain competences to be performed.
    public competence: Competence | null;
    public products: Array<ItemInstance>;

    constructor(source?: Partial<Recipe>) {
        super(source);
        this.category = 'RECIPE';

        this.kind = source?.kind ?? 'CRAFTING';
        this.ingredients = source?.ingredients ? [...source.ingredients] : new Array();
        this.competence = source?.competence ?? null;
        this.products = source?.products ? [...source.products] : new Array();
    }

}