import { SkillIdentifier } from "./skill";


// Competence represents a specific required skill and its level to use an ability and contribution to experience gain.
export interface Competence {
    skill: SkillIdentifier;
    requiredLevel: number;
    experienceContribution: number;
}