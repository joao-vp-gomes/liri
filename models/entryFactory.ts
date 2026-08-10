// models/entryFactory.ts


import { Entry, type EntryCategory } from "./entry.ts";
import { Character } from "./character.ts";
import { Ability } from "./ability.ts";
import { Recipe } from "./recipe.ts";
import { ItemFactory } from "./itemFactory.ts";


export class EntryFactory {

    private static registry = {
        'ENTRY': Entry,
        'CHARACTER': Character,
        'ABILITY': Ability,
        'RECIPE': Recipe
    };

    public static instantiate(data: any): Entry {
        const category = data?.category as EntryCategory;
        if (category === 'ITEM') return ItemFactory.instantiate(data);
        const TargetClass = this.registry[category] || Entry;
        return new TargetClass(data);
    }

}