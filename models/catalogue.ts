// models/catalogue.ts


import type { ItemInstance } from "./utils/itemInstance";
import { Entry } from "./entry";
import type { Ingredient } from "./utils/ingredient";
import type { Competence } from "./utils/competence";


export type RecipeKind = 'CRAFTING' | 'ALCHEMY' | 'PURCHASE';

export const CRAFTING_GRID_SIZE = 9;

export interface Recipe {
    ingredients: Array<Ingredient>;
    products: Array<ItemInstance>;
    competence: Competence | null;
    difficulty: number;
}

export interface CraftingRecipe {
    grid: Array<string | null>;
    product: ItemInstance | null;
    competence: Competence | null;
    difficulty: number;
}

export class Catalogue extends Entry {

    public kind: RecipeKind;
    public recipes: Array<Recipe>;
    public craftingRecipes: Array<CraftingRecipe>;

    constructor(source?: Partial<Catalogue>) {
        super(source);
        this.category = 'CATALOGUE';

        this.kind = source?.kind ?? 'CRAFTING';
        this.recipes = source?.recipes ? [...source.recipes] : new Array();
        this.craftingRecipes = source?.craftingRecipes ? [...source.craftingRecipes] : new Array();
    }

}
