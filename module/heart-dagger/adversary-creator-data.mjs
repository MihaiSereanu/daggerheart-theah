const range = (min, max = min) => Object.freeze({ min, max });

export const ADVERSARY_IMAGES = Object.freeze({
    normal: 'tokenizer/npc-images/generic_monster_a.token.webp',
    champion: 'tokenizer/npc-images/generic_monster_b.token.webp'
});

export const ADVERSARY_CREATION_TABLE = Object.freeze({
    bruiser: {
        label: 'Bruiser',
        difficulty: range(12, 15),
        majorThreshold: range(7, 9),
        severeThreshold: range(14, 18),
        hitPoints: range(5, 7),
        stress: range(3, 4),
        attackModifier: range(0, 2),
        damage: { formula: '1d12+2' }
    },
    horde: {
        label: 'Horde',
        difficulty: range(10, 12),
        majorThreshold: range(5, 10),
        severeThreshold: range(10, 12),
        hitPoints: range(5, 6),
        stress: range(2, 3),
        attackModifier: range(-2, 0),
        damage: { formula: '1d8+4' }
    },
    leader: {
        label: 'Leader',
        difficulty: range(12, 15),
        majorThreshold: range(8, 12),
        severeThreshold: range(13, 16),
        hitPoints: range(5, 7),
        stress: range(3, 4),
        attackModifier: range(2, 4),
        damage: { formula: '1d10+3' }
    },
    minion: {
        label: 'Minion',
        difficulty: range(10, 12),
        majorThreshold: null,
        severeThreshold: range(1),
        hitPoints: range(1),
        stress: range(1),
        attackModifier: range(3, 5),
        damage: range(1, 3)
    },
    ranged: {
        label: 'Ranged',
        difficulty: range(12, 14),
        majorThreshold: range(3, 5),
        severeThreshold: range(6, 9),
        hitPoints: range(3, 4),
        stress: range(2, 3),
        attackModifier: range(1, 2),
        damage: { formula: '1d8+5' }
    },
    skulk: {
        label: 'Skulk',
        difficulty: range(10, 12),
        majorThreshold: range(5, 7),
        severeThreshold: range(8, 12),
        hitPoints: range(3, 4),
        stress: range(2, 3),
        attackModifier: range(1, 2),
        damage: { formula: '1d6+4' }
    },
    solo: {
        label: 'Solo',
        difficulty: range(12, 15),
        majorThreshold: range(8, 12),
        severeThreshold: range(13, 16),
        hitPoints: range(8, 10),
        stress: range(3, 4),
        attackModifier: range(2, 3),
        damage: { formula: '1d20+4' }
    },
    social: {
        label: 'Social',
        difficulty: range(10, 15),
        majorThreshold: range(4, 6),
        severeThreshold: range(8, 10),
        hitPoints: range(2, 4),
        stress: range(3, 5),
        attackModifier: range(-4, 0),
        damage: { formula: '1d4' }
    },
    standard: {
        label: 'Standard',
        difficulty: range(12),
        majorThreshold: range(5, 8),
        severeThreshold: range(9, 12),
        hitPoints: range(3, 4),
        stress: range(4, 5),
        attackModifier: range(0, 2),
        damage: { formula: '1d6+2' }
    },
    support: {
        label: 'Support',
        difficulty: range(13),
        majorThreshold: range(5),
        severeThreshold: range(9),
        hitPoints: range(4),
        stress: range(4),
        attackModifier: range(2),
        damage: { formula: '1d6+2' }
    }
});

export const CREATOR_STAT_FIELDS = Object.freeze([
    { key: 'difficulty', label: 'Difficulty' },
    { key: 'majorThreshold', label: 'Major Threshold' },
    { key: 'severeThreshold', label: 'Severe Threshold' },
    { key: 'hitPoints', label: 'Hit Points' },
    { key: 'stress', label: 'Stress' },
    { key: 'attackModifier', label: 'Attack Modifier', signed: true }
]);

export function getRangeInitialValue(valueRange) {
    return Math.round((valueRange.min + valueRange.max) / 2);
}

export function getChampionAdjustment(key) {
    return ['hitPoints', 'stress'].includes(key) ? 2 : 5;
}

export function getEffectiveValue(key, value, champion = false) {
    if (value === null || value === undefined) return value;
    return Number(value) + (champion ? getChampionAdjustment(key) : 0);
}

export function getDamageFormula(damage, value, champion = false) {
    if (!damage.formula) return String(getEffectiveValue('damage', value, champion));
    if (!champion) return damage.formula;

    const trailingBonus = damage.formula.match(/([+-])(\d+)$/);
    if (!trailingBonus) return `${damage.formula}+5`;

    const existing = Number(trailingBonus[2]) * (trailingBonus[1] === '-' ? -1 : 1);
    const updated = existing + 5;
    return `${damage.formula.slice(0, trailingBonus.index)}${updated >= 0 ? '+' : ''}${updated}`;
}

export function getCreatorFields(type) {
    const benchmark = ADVERSARY_CREATION_TABLE[type];
    if (!benchmark) throw new Error(`Unknown adversary type: ${type}`);

    return CREATOR_STAT_FIELDS.map(field => {
        const valueRange = benchmark[field.key];
        if (!valueRange) return { ...field, unavailable: true };
        return {
            ...field,
            ...valueRange,
            value: getRangeInitialValue(valueRange),
            ranged: valueRange.min !== valueRange.max
        };
    });
}

export function buildAdversarySource({
    name,
    type,
    champion = false,
    description = '',
    motivesAndTactics = '',
    experiences = [],
    stats,
    featureSources = [],
    createId = () => Math.random().toString(36).slice(2, 18)
}) {
    const benchmark = ADVERSARY_CREATION_TABLE[type];
    if (!benchmark) throw new Error(`Unknown adversary type: ${type}`);

    const majorThreshold = benchmark.majorThreshold
        ? getEffectiveValue('majorThreshold', stats.majorThreshold, champion)
        : 0;
    const damage = getDamageFormula(benchmark.damage, stats.damage, champion);
    const experienceData = Object.fromEntries(
        experiences
            .map(value => value.trim())
            .filter(Boolean)
            .map(value => [createId(), { name: value, value: 2, description: '' }])
    );
    const image = ADVERSARY_IMAGES[champion ? 'champion' : 'normal'];

    return {
        name: name.trim(),
        type: 'adversary',
        img: image,
        system: {
            description,
            classification: champion ? 'champion' : 'normal',
            type,
            difficulty: getEffectiveValue('difficulty', stats.difficulty, champion),
            damageThresholds: {
                major: majorThreshold,
                severe: getEffectiveValue('severeThreshold', stats.severeThreshold, champion)
            },
            resources: {
                hitPoints: {
                    value: 0,
                    max: getEffectiveValue('hitPoints', stats.hitPoints, champion)
                },
                stress: {
                    value: 0,
                    max: getEffectiveValue('stress', stats.stress, champion)
                }
            },
            motivesAndTactics,
            experiences: experienceData,
            attack: {
                _id: '000BASEATTACK000',
                name: 'Attack',
                type: 'attack',
                systemPath: 'attack',
                baseAction: true,
                chatDisplay: false,
                img: 'icons/skills/melee/blood-slash-foam-red.webp',
                target: { type: 'any', amount: 1 },
                range: 'melee',
                roll: {
                    type: 'attack',
                    trait: null,
                    bonus: getEffectiveValue('attackModifier', stats.attackModifier, champion)
                },
                damage: {
                    main: {
                        type: ['physical'],
                        applyTo: 'hitPoints',
                        value: {
                            custom: { enabled: true, formula: damage }
                        }
                    }
                }
            }
        },
        items: featureSources,
        prototypeToken: {
            name: name.trim(),
            actorLink: false,
            texture: { src: image }
        }
    };
}
