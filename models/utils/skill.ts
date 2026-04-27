// Still deciding wether to implement it or not.

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
    public currentLevel: number;
    public currentExperience: number;

    constructor(source?: Partial<Skill>) {
        this.identifier = source?.identifier ?? 'IDENTIFIER';
        this.currentLevel = source?.currentLevel ? Math.min(MAX_SKILL_LEVEL, Math.max(0, source.currentLevel)): 0;
        this.currentExperience = source?.currentExperience ? Math.min(SKILL_PROGRESSION_EXPERIENCE_REQ[this.currentLevel], Math.max(0, source.currentExperience)): 0;
    }

    adjustExperience(expAdjustment: number): number {
        let remaining = expAdjustment;

        if (remaining > 0) {
            while (remaining > 0 && this.currentLevel < MAX_SKILL_LEVEL) {
                const expToNextLevel = SKILL_PROGRESSION_EXPERIENCE_REQ[this.currentLevel] - this.currentExperience;
                if (remaining >= expToNextLevel) {
                    remaining -= expToNextLevel;
                    this.currentLevel++;
                    this.currentExperience = 0;
                } else {
                    this.currentExperience += remaining;
                    remaining = 0;
                }
            }
        } else {
            while (remaining < 0) {
                if (this.currentExperience + remaining >= 0) {
                    this.currentExperience += remaining;
                    remaining = 0;
                } else {
                    remaining += this.currentExperience;
                    if (this.currentLevel === 0) break;
                    this.currentLevel--;
                    this.currentExperience = SKILL_PROGRESSION_EXPERIENCE_REQ[this.currentLevel];
                }
            }
        }

        return remaining;
    }

}

export const SKILL_PROGRESSION_EXPERIENCE_REQ = [
    100 /*0->1*/, 200/*1->2*/, 500/*2->3*/, 1000/*3->4*/
];
export const MAX_SKILL_LEVEL = SKILL_PROGRESSION_EXPERIENCE_REQ.length;

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