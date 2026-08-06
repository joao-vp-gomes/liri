// models/utils/modifier.ts


import { Effect } from "./effect";


// Modifiers apply effects.
export interface Modifier {
    name: string;
    description: string | null;
    effects: Effect[];
}


