import { Entry } from "./entry";
import { AbilitiesGrimmoire } from "./utils/abilitiesGrimmoire";
import { Effect, EffectIdentifier } from "./utils/effect";
import { Modifier } from "./utils/modifier";
import { AttributesConstellation, DEFAULT_ATTRIBUTES_CONSTELLATION } from "./utils/attributesConstellation";
import { ItemsInventory } from "./utils/itemsInventory";
import { DEFAULT_STATS_CONDITION, Stat, StatsCondition } from "./utils/statsCondition";
import { Wearable } from "./item";
import { SkillsScroll } from "./utils/skill";


export class Character extends Entry {
    
    public inventory: ItemsInventory;
    public grimmoire: AbilitiesGrimmoire;
    public constellation: AttributesConstellation;
    public scroll: SkillsScroll;
    public condition: StatsCondition;
    public traits: Array<Modifier>;

    constructor(source?: Partial<Character>) {
        super(source);
        this.category = 'CHARACTER';

        this.inventory = source?.inventory ? new ItemsInventory(source.inventory) : new ItemsInventory();
        this.grimmoire = source?.grimmoire ? new AbilitiesGrimmoire(source.grimmoire) : new AbilitiesGrimmoire();
        this.constellation = source?.constellation ?? {...DEFAULT_ATTRIBUTES_CONSTELLATION};
        this.scroll = source?.scroll ? new SkillsScroll(source.scroll) : new SkillsScroll();
        this.condition = source?.condition ?? {...DEFAULT_STATS_CONDITION};
        this.traits = source?.traits ? [...source.traits] : new Array();
        
    }

    searchEffect(source: Array<Modifier> | null | undefined, identifier: EffectIdentifier, baseAccumulation: {adder:number,multiplier:number,setter:number|null}): {adder:number,multiplier:number,setter:number|null} {
        const accumulation = {...baseAccumulation};
        if (source === null || source === undefined) return accumulation;
        source.forEach((trait: Modifier) => {
            trait.effects.forEach((effect: Effect) => {
                if (effect.identifier !== identifier) return;
                switch(effect.mode) {
                    case 'ADDER': accumulation.adder += effect.value; return;
                    case 'MULTIPLIER': accumulation.multiplier *= effect.value; return;
                    case 'SETTER': accumulation.setter = Math.min(accumulation.setter || Number.MAX_SAFE_INTEGER, effect.value); return;
                    default: return;
                }
            })
        })
        return accumulation;
    }
    accumulateEffect(identifier: EffectIdentifier, baseValue: number = 0): number {

        let accumulation = {
            adder: 0 as number,
            multiplier: 1 as number,
            setter: null as (number | null)
        }

        accumulation = this.searchEffect(this.traits, identifier, accumulation);

        const eq = this.inventory.equipment;
        for (const slot of [ eq.apparel, eq.leftHand, eq.rightHand, eq.accessory1, eq.accessory2, eq.container ]) {
            if (slot?.reference instanceof Wearable) accumulation = this.searchEffect(slot.reference.traits, identifier, accumulation);
            accumulation = this.searchEffect(slot?.quirks, identifier, accumulation);
        }

        if (accumulation.setter !== null) return accumulation.setter;
        return (baseValue + accumulation.adder)*accumulation.multiplier;
    }

    getMaxStatValue(stat: Stat): number {

        let baseValue = 0; let rate = 0; let variable = 0;
        const attCons = this.constellation

        switch(stat) {
            case 'HEALTH': 
                baseValue = 16; rate = 8;
                variable += this.accumulateEffect('WARRIOR_PATH', attCons.warriorPath);
                variable += this.accumulateEffect('CONSTITUTION', attCons.constitution);
                break;
            case 'ENERGY': 
                baseValue = 4; rate = 2;
                variable += this.accumulateEffect('ROGUE_PATH', attCons.roguePath);
                variable += this.accumulateEffect('BREATH', attCons.breath);
                break;
            case 'FOCUS': 
                baseValue = 4; rate = 2;
                variable += this.accumulateEffect('SAGE_PATH', attCons.sagePath);
                variable += this.accumulateEffect('INTELLECT', attCons.intellect);
                break;
            case 'ANIMA': 
                baseValue = 4; rate = 2;
                variable += this.accumulateEffect('POET_PATH', attCons.poetPath);
                variable += this.accumulateEffect('CHARISMA', attCons.charisma);
                break;
            default: break;
        }

        return Math.max(0, this.accumulateEffect(stat, Math.floor(baseValue + rate*variable)));
    }
    setStatValue(stat: Stat, valueToSet: number): void {
        if(valueToSet < 0 || valueToSet > this.getMaxStatValue(stat)) return;
        switch(stat) {
            case 'HEALTH': this.condition.health = valueToSet; return;
            case 'ENERGY': this.condition.energy = valueToSet; return;
            case 'FOCUS': this.condition.focus = valueToSet; return;
            case 'ANIMA': this.condition.anima = valueToSet; return;
        }
    }

}