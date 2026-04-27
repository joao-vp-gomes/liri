export type EffectMode = 'ADDER' | 'MULTIPLIER' | 'SETTER';
export interface Effect {
    identifier: EffectIdentifier;
    mode: EffectMode;
    value: number;
}

// Just for suggestions, actually any string can be used as an identifier.
export type EffectIdentifier = (
    | 'SLASHING_RESISTANCE'
    | 'PIERCING_RESISTANCE'
    | 'BLUDGEONING_RESISTANCE'
    | 'ARCANE_RESISTANCE'
    | 'SLASHING_PROTECTION'
    | 'PIERCING_PROTECTION'
    | 'BLUDGEONING_PROTECTION'
    | 'ARCANE_PROTECTION'
    | 'SLASHING_DAMAGE'
    | 'PIERCING_DAMAGE'
    | 'BLUDGEONING_DAMAGE'
    | 'ARCANE_DAMAGE'
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