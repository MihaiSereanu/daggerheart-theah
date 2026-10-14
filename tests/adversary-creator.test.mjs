import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
    ADVERSARY_CREATION_TABLE,
    buildAdversarySource,
    getCreatorFields,
    getDamageFormula,
    getEffectiveValue
} from '../module/heart-dagger/adversary-creator-data.mjs';

const compact = entry => ({
    difficulty: [entry.difficulty.min, entry.difficulty.max],
    major: entry.majorThreshold ? [entry.majorThreshold.min, entry.majorThreshold.max] : null,
    severe: [entry.severeThreshold.min, entry.severeThreshold.max],
    hitPoints: [entry.hitPoints.min, entry.hitPoints.max],
    stress: [entry.stress.min, entry.stress.max],
    attack: [entry.attackModifier.min, entry.attackModifier.max],
    damage: entry.damage.formula ?? [entry.damage.min, entry.damage.max]
});

test('adversary creation table preserves every supplied range', () => {
    assert.deepEqual(Object.fromEntries(
        Object.entries(ADVERSARY_CREATION_TABLE).map(([type, entry]) => [type, compact(entry)])
    ), {
        bruiser: { difficulty: [12, 15], major: [7, 9], severe: [14, 18], hitPoints: [5, 7], stress: [3, 4], attack: [0, 2], damage: '1d12+2' },
        horde: { difficulty: [10, 12], major: [5, 10], severe: [10, 12], hitPoints: [5, 6], stress: [2, 3], attack: [-2, 0], damage: '1d8+4' },
        leader: { difficulty: [12, 15], major: [8, 12], severe: [13, 16], hitPoints: [5, 7], stress: [3, 4], attack: [2, 4], damage: '1d10+3' },
        minion: {
            difficulty: [10, 12], major: null, severe: [1, 1], hitPoints: [1, 1], stress: [1, 1],
            attack: [3, 5], damage: [1, 3]
        },
        ranged: { difficulty: [12, 14], major: [3, 5], severe: [6, 9], hitPoints: [3, 4], stress: [2, 3], attack: [1, 2], damage: '1d8+5' },
        skulk: { difficulty: [10, 12], major: [5, 7], severe: [8, 12], hitPoints: [3, 4], stress: [2, 3], attack: [1, 2], damage: '1d6+4' },
        solo: { difficulty: [12, 15], major: [8, 12], severe: [13, 16], hitPoints: [8, 10], stress: [3, 4], attack: [2, 3], damage: '1d20+4' },
        social: { difficulty: [10, 15], major: [4, 6], severe: [8, 10], hitPoints: [2, 4], stress: [3, 5], attack: [-4, 0], damage: '1d4' },
        standard: { difficulty: [12, 12], major: [5, 8], severe: [9, 12], hitPoints: [3, 4], stress: [4, 5], attack: [0, 2], damage: '1d6+2' },
        support: { difficulty: [13, 13], major: [5, 5], severe: [9, 9], hitPoints: [4, 4], stress: [4, 4], attack: [2, 2], damage: '1d6+2' }
    });
});

test('only actual table ranges become slider fields', () => {
    const bruiser = Object.fromEntries(getCreatorFields('bruiser').map(field => [field.key, field]));
    const support = Object.fromEntries(getCreatorFields('support').map(field => [field.key, field]));
    const minion = Object.fromEntries(getCreatorFields('minion').map(field => [field.key, field]));

    assert.equal(bruiser.difficulty.ranged, true);
    assert.equal(bruiser.hitPoints.ranged, true);
    assert.equal(support.difficulty.ranged, false);
    assert.equal(support.hitPoints.ranged, false);
    assert.equal(minion.majorThreshold.unavailable, true);
});

test('Champion adds two to HP and Stress and five to other numbers', () => {
    assert.equal(getEffectiveValue('hitPoints', 6, true), 8);
    assert.equal(getEffectiveValue('stress', 4, true), 6);
    assert.equal(getEffectiveValue('difficulty', 14, true), 19);
    assert.equal(getEffectiveValue('majorThreshold', 8, true), 13);
    assert.equal(getEffectiveValue('attackModifier', -2, true), 3);
    assert.equal(getDamageFormula({ formula: '1d12+2' }, undefined, true), '1d12+7');
    assert.equal(getDamageFormula({ formula: '1d4' }, undefined, true), '1d4+5');
    assert.equal(getDamageFormula({ min: 1, max: 3 }, 2, true), '7');
});

test('created Champion source applies bonuses, keeps Minion major threshold absent, and embeds features', () => {
    const feature = { name: 'Frenzy', type: 'feature', system: { featureForm: 'reaction' } };
    const source = buildAdversarySource({
        name: '  Test Minion  ',
        type: 'minion',
        champion: true,
        description: 'Small but dangerous.',
        motivesAndTactics: 'Swarm, distract',
        experiences: ['Ambusher', '', 'Pack Hunter'],
        stats: {
            difficulty: 11,
            majorThreshold: 0,
            severeThreshold: 1,
            hitPoints: 1,
            stress: 1,
            attackModifier: 4,
            damage: 2
        },
        featureSources: [feature],
        createId: (() => {
            let id = 0;
            return () => `experience-${++id}`;
        })()
    });

    assert.equal(source.name, 'Test Minion');
    assert.equal(source.system.classification, 'champion');
    assert.equal(source.system.difficulty, 16);
    assert.deepEqual(source.system.damageThresholds, { major: 0, severe: 6 });
    assert.equal(source.system.resources.hitPoints.max, 3);
    assert.equal(source.system.resources.stress.max, 3);
    assert.equal(source.system.attack.roll.bonus, 9);
    assert.equal(source.system.attack.damage.main.value.custom.formula, '7');
    assert.deepEqual(source.system.experiences, {
        'experience-1': { name: 'Ambusher', value: 2, description: '' },
        'experience-2': { name: 'Pack Hunter', value: 2, description: '' }
    });
    assert.deepEqual(source.items, [feature]);
    assert.equal(source.img, 'tokenizer/npc-images/generic_monster_b.token.webp');
    assert.equal(source.prototypeToken.texture.src, 'tokenizer/npc-images/generic_monster_b.token.webp');
});

test('created ordinary adversary uses the non-Champion actor and token image', () => {
    const source = buildAdversarySource({
        name: 'Ordinary Foe',
        type: 'standard',
        stats: {
            difficulty: 12,
            majorThreshold: 6,
            severeThreshold: 10,
            hitPoints: 3,
            stress: 4,
            attackModifier: 1
        }
    });

    assert.equal(source.img, 'tokenizer/npc-images/generic_monster_a.token.webp');
    assert.equal(source.prototypeToken.texture.src, 'tokenizer/npc-images/generic_monster_a.token.webp');
});

test('ApplicationV2 template part has one root element', () => {
    const template = fs.readFileSync(
        new URL('../templates/dialogs/adversary-creator.hbs', import.meta.url),
        'utf8'
    ).trim();
    assert.match(template, /^<div class="adversary-creator-part">[\s\S]*<\/div>$/);
    assert.match(template, /data-action="toggleFeaturePreview"/);
});
