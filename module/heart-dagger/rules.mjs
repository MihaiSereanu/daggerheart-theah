export const XP_THRESHOLDS = [0, 10, 25, 50, 75, 100, 125, 150, 175, 200];
export const TRAITS = ['brawn', 'charm', 'finesse', 'instinct', 'wits'];
export const SUPPLY_DICE = [0, 4, 6, 8, 10, 12];
export const ADVANCEMENT_SLOTS = { trait: 3, hitPoint: 2, stress: 2, experience: 1, evasion: 1 };
export const levelForXP = xp => Math.max(1, XP_THRESHOLDS.filter(threshold => xp >= threshold).length);
export const advancementPhaseForLevel = level => level >= 8 ? 3 : level >= 5 ? 2 : 1;
export const rewardForLevel = level => level % 2 === 0 ? 'talent' : 'advancement';
export const traitCount = value => value < 0 ? 1 : value;
export const supplyAfterRoll = (die, result) => result <= 2
    ? SUPPLY_DICE[Math.max(0, SUPPLY_DICE.indexOf(die) - 1)] : die;
export const intrigueTicks = outcome =>
    ({ critical: 3, successHope: 3, successFear: 2, failureHope: 1, failureFear: 0 })[outcome] ?? 0;
export const pitfallTicks = outcome =>
    ({ critical: 0, successHope: 0, successFear: 1, failureHope: 2, failureFear: 3 })[outcome] ?? 0;
export const armourThresholds = armor => ({
    major: armor?.baseThresholds.major ?? 4, severe: armor?.baseThresholds.severe ?? 8
});

export function talentAccess({ domain, granted, existing, tradition, domains }) {
    if (granted) return null;
    if (domains[domain]?.tradition) return tradition === domain ? null : 'A feature must grant access to this Sorcerous Tradition.';
    const chosen = new Set(existing.filter(t => !t.granted && !domains[t.domain]?.tradition).map(t => t.domain));
    return chosen.has(domain) || chosen.size < 2 ? null : 'You may learn Talents from up to two standard Domains.';
}

export function advancementAvailable(type, phase, currentLevel, history) {
    if (phase > advancementPhaseForLevel(currentLevel)) return false;
    if (type === 'talent') return true;
    return history.flatMap(level => level.choices).filter(c => c.type === type && (c.phase ?? c.tier) === phase).length
        < ADVANCEMENT_SLOTS[type];
}
