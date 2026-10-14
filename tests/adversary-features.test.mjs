import assert from 'node:assert/strict';
import test from 'node:test';
import {
    buildAdversaryFeatures,
    genericizeAdversaryFeature,
    parseAdversaryFeatureName
} from '../tools/adversary-features.mjs';

test('genericizes singular, possessive, and plural self-references', () => {
    assert.equal(
        genericizeAdversaryFeature('<p>The Hydra uses the Hydraâ€™s heads.</p>\n', 'Hydra'),
        '<p>The adversary uses the adversary\'s heads.</p>\n'
    );
    assert.equal(
        genericizeAdversaryFeature('<p>Spotlight all Bandit Lackeys. Those Minions attack.</p>\n', 'Bandit Lackey'),
        '<p>Spotlight all adversaries with this feature. Those adversaries attack.</p>\n'
    );
});

test('keeps mechanically different features that share a name', () => {
    const adversaries = [
        { name: 'Hydra', items: [{ name: 'Strike - Action', type: 'feature', img: 'a.webp', system: { description: '<p>The Hydra deals 2 damage.</p>\n' }, effects: [] }] },
        { name: 'Bear', items: [{ name: 'Strike - Action', type: 'feature', img: 'b.webp', system: { description: '<p>The Bear deals 3 damage.</p>\n' }, effects: [] }] }
    ];
    assert.equal(buildAdversaryFeatures(adversaries).length, 2);
});

test('collapses mechanically identical generic features', () => {
    const adversaries = [
        { name: 'Hydra', items: [{ name: 'Momentum - Reaction', type: 'feature', img: 'a.webp', system: { description: '<p>When the Hydra hits a PC with an attack, you gain 1 Fear.</p>\n' }, effects: [] }] },
        { name: 'Bear', items: [{ name: 'Momentum - Reaction', type: 'feature', img: 'a.webp', system: { description: '<p>When the Bear makes a successful attack against a PC, you gain a Fear.</p>\n' }, effects: [] }] }
    ];
    assert.equal(buildAdversaryFeatures(adversaries).length, 1);
});

test('keeps references to summoned creature types and removes trailing source sections', () => {
    assert.equal(
        genericizeAdversaryFeature('<p>Summon 1d4 Demon minions.</p>\n<hr>\n<h1>Champions</h1>\n', 'Demon of Wrath'),
        '<p>Summon 1d4 Demon minions.</p>\n'
    );
});

test('moves the feature form out of every supported title suffix', () => {
    assert.deepEqual(parseAdversaryFeatureName('Frenzy - Reaction'), { name: 'Frenzy', featureForm: 'reaction' });
    assert.deepEqual(parseAdversaryFeatureName('Climber - Passive'), { name: 'Climber', featureForm: 'passive' });
    assert.deepEqual(parseAdversaryFeatureName('Bite - Action'), { name: 'Bite', featureForm: 'action' });
    assert.deepEqual(parseAdversaryFeatureName('Many Headed Reach — Passive'), {
        name: 'Many Headed Reach', featureForm: 'passive'
    });
    assert.deepEqual(parseAdversaryFeatureName('Minion (4 - Passive)'), {
        name: 'Minion (4)', featureForm: 'passive'
    });
});

