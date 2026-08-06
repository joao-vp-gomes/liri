export class SkillsScroll {

    public skills: Array<Skill>;

    constructor(source?: SkillsScroll) {
        this.skills = source?.skills ? [...source.skills] : new Array();
    }

    addSkill(skillIdentifier: SkillIdentifier): void {
        this.skills.push(new Skill({ identifier: skillIdentifier }))
    }

    removeSkill(index: number): void {
        if (index < 0 || index >= this.skills.length) return;
        this.skills.splice(index, 1);
    }

}

export class Skill {

    public identifier: SkillIdentifier;
    public currentExperience: number;

    constructor(source?: Partial<Skill>) {
        this.identifier = source?.identifier ?? 'IDENTIFIER';
        this.currentExperience = source?.currentExperience ? Math.max(0, source.currentExperience) : 0;
    }

    adjustExperience(expAdjustment: number) {
        this.currentExperience = Math.max(0, this.currentExperience + expAdjustment);
    }

    setExperience(expValue: number) {
        this.currentExperience = expValue;
    }

}

export type SkillIdentifier = (
    | 'BONE_TREATMENT'
    | 'BLOOD_TREATMENT'
    | 'NERVES_TREATMENT'

    | 'PYROTECHNICS_ALCHEMY'
    | 'ELIXIRS_ALCHEMY'
    | 'OILS_ALCHEMY'

    | 'SMITH_CRAFT'
    | 'ENGINEER_CRAFT'
    | 'TINKER_CRAFT'

    | 'COMEDY_ART'
    | 'TRAGEDY_ART' 
    | 'EPIC_ART'
    | 'LYRIC_ART'

    | 'HAMMER_BRAWL' 
    | 'FIST_BRAWL'
    | 'ROD_BRAWL'
    | 'AXE_BRAWL'
    | 'SWORD_BRAWL' 
    | 'HALBERD_BRAWL'
    | 'SPEAR_BRAWL'
    | 'DAGGER_BRAWL' 
    | 'BOW_BRAWL'
    | (string & {})
);