import { ItemInstance } from "./utils/itemInstance";
import { Entry } from "./entry";
import { Ingredient } from "./utils/ingredient";


export type RecipeKind = 'CRAFTING' | 'SMITHING' | 'ALCHEMY' | 'ENCHANTING' | 'COOKING';
export class Recipe extends Entry {
    
    public kind: RecipeKind;
    public ingredients: Array<Ingredient>;
    //public competence: Competence | null;
    public product: ItemInstance | null;

    constructor(source?: Partial<Recipe>) {
        super(source);
        this.category = 'RECIPE';

        this.kind = source?.kind ?? 'CRAFTING';
        this.ingredients = source?.ingredients ? [...source.ingredients] : new Array();
        //this.competence = source?.competence ?? null;
        this.product = source?.product ?? null;
    }

}