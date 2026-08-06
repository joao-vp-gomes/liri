// models/utils/statsCondition.ts


export const DEFAULT_STATS_CONDITION = {
    health: 0 as number,
    energy: 0 as number,
    focus: 0 as number, 
    anima: 0 as number,
}

export type Stat = 
    | 'HEALTH'
    | 'ENERGY'
    | 'FOCUS'
    | 'ANIMA'
export type StatsCondition = typeof DEFAULT_STATS_CONDITION;