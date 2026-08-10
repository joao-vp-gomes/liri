// models/utils/skillsScroll.ts


import { Skill, type SkillIdentifier } from "./skill";


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