// models/utils/modifier.ts


import type { Effect } from "./effect";


// Modifiers apply effects.
export interface Modifier {
    name: string;
    description: string | null;
    effects: Effect[];
}


