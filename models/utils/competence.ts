// models/utils/competence.ts
// Competence represents a specific required skill and its experience to use an ability and contribution to experience gain.


import { SkillIdentifier } from "./skill";


export interface Competence {
    skill: SkillIdentifier;
    requiredExp: number;
    experienceContribution: number;
}