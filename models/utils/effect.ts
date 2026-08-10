// models/utils/effect.ts
// Can be either quirks (for instances) or traits (for entries).


export type EffectMode = 'ADDER' | 'MULTIPLIER' | 'SETTER';
export interface Effect {
    identifier: EffectIdentifier;
    mode: EffectMode;
    value: number;
}

// Just for suggestions, actually any string can be used as an identifier.
export type EffectIdentifier = (
    | 'SLASH_RESISTANCE'
    | 'PIERCE_RESISTANCE'
    | 'BLUDGEON_RESISTANCE'
    | 'ARCANE_RESISTANCE'
    | 'WITHER_RESISTANCE'
    | 'DELIRIUM_RESISTANCE'
    | 'TAINT_RESISTANCE'
    | 'POISON_RESISTANCE'
    | 'SLASH_PROTECTION'
    | 'PIERCE_PROTECTION'
    | 'BLUDGEON_PROTECTION'
    | 'ARCANE_PROTECTION'
    | 'WITHER_PROTECTION'
    | 'DELIRIUM_PROTECTION'
    | 'TAINT_PROTECTION'
    | 'POISON_PROTECTION'
    | 'SLASH_DAMAGE'
    | 'PIERCE_DAMAGE'
    | 'BLUDGEON_DAMAGE'
    | 'ARCANE_DAMAGE'
    | 'WITHER_DAMAGE'
    | 'DELIRIUM_DAMAGE'
    | 'TAINT_DAMAGE'
    | 'POISON_DAMAGE'
    | 'WARRIOR_PATH'
    | 'CONSTITUTION'
    | 'LETHALITY'
    | 'PROWESS'
    | 'STRENGTH'
    | 'TEMPER'
    | 'INSTINCT'
    | 'ROGUE_PATH'
    | 'BREATH'
    | 'STEALTH'
    | 'PRECISION'
    | 'DEXTERITY'
    | 'METABOLISM'
    | 'SHIVERS'
    | 'SAGE_PATH'
    | 'ERUDITION'
    | 'BREWINGS'
    | 'ARTIFICES'
    | 'INTELLECT'
    | 'COMPOSURE'
    | 'INSIGHT'
    | 'POET_PATH'
    | 'DRAMA'
    | 'RHETORIC'
    | 'THREAT'
    | 'CHARISMA'
    | 'ATTUNEMENT'
    | 'EMPATHY'
    | (string & {})
);