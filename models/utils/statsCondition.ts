export const DEFAULT_STATS_CONDITION = {
    health: 0 as number,
    energy: 0 as number,
    focus: 0 as number,
    animo: 0 as number,
}

export type Stat = 
    | 'HEALTH'
    | 'ENERGY'
    | 'FOCUS'
    | 'ANIMO'
export type StatsCondition = typeof DEFAULT_STATS_CONDITION;