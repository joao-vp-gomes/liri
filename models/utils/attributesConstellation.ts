

export const DEFAULT_ATTRIBUTES_CONSTELLATION = {

    warriorPath: 0 as number,
    // Attributes of the path of the warrior:
    prowess: 0 as number,
    strength: 0 as number,
    lethality: 0 as number, 
    constitution: 0 as number, // STAT
    temper: 0 as number, // RESISTANCE
    instinct: 0 as number, // PERCEPTION

    roguePath: 0 as number,
    // Attributes of the path of the rogue:
    stealth: 0 as number,
    precision: 0 as number,
    dexterity: 0 as number,
    breath: 0 as number, // STAT 
    metabolism: 0 as number, // RESISTANCE
    shivers: 0 as number, // PERCEPTION

    sagePath: 0 as number,
    // Attributes of the path of the sage:
    pharmacy: 0 as number,
    engineering: 0 as number,
    erudition: 0 as number,
    intellect: 0 as number, // STAT
    composure: 0 as number, // RESISTANCE
    insight: 0 as number, // PERCEPTION

    poetPath: 0 as number,
    // Attributes of the path of the poet:
    drama: 0 as number,
    rhetoric: 0 as number,
    threat: 0 as number, 
    charisma: 0 as number, // STAT
    attunement: 0 as number, // RESISTANCE
    empathy: 0 as number, // PERCEPTION

}

export type AttributesConstellation = typeof DEFAULT_ATTRIBUTES_CONSTELLATION;