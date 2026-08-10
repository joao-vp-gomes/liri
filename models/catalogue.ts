// models/catalogue.ts


import type { ItemInstance } from "./utils/itemInstance";
import { Entry } from "./entry";
import type { Ingredient } from "./utils/ingredient";
import type { Competence } from "./utils/competence";


export type RecipeKind = 'CRAFTING' | 'SMITHING' | 'ALCHEMY' | 'ENCHANTING' | 'COOKING' | 'PURCHASE';

export interface Recipe {
    ingredients: Array<Ingredient>;
    competence: Competence | null;
    products: Array<ItemInstance>;
}

export class Catalogue extends Entry {

    public kind: RecipeKind;
    public recipes: Array<Recipe>;

    constructor(source?: Partial<Catalogue>) {
        super(source);
        this.category = 'CATALOGUE';

        this.kind = source?.kind ?? 'CRAFTING';
        this.recipes = source?.recipes ? [...source.recipes] : new Array();
    }

}
