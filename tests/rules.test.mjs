import test from 'node:test';
import assert from 'node:assert/strict';
import { levelForXP, rewardForLevel, supplyAfterRoll, talentAccess, armourThresholds, advancementAvailable, intrigueTicks, pitfallTicks, traitCount } from '../module/heart-dagger/rules.mjs';

test('XP uses cumulative manuscript thresholds and alternating rewards', () => {
    assert.deepEqual([0, 9, 10, 24, 25, 74, 75, 199, 200, 250].map(levelForXP), [1, 1, 2, 2, 3, 4, 5, 9, 10, 10]);
    assert.equal(rewardForLevel(2), 'talent'); assert.equal(rewardForLevel(3), 'advancement');
});
test('Supply exhaustion follows the last use and successful rolls preserve the die', () => {
    assert.equal(supplyAfterRoll(4, 1), 0);
    assert.equal(supplyAfterRoll(6, 2), 4);
    assert.equal(supplyAfterRoll(6, 3), 6);
});
test('armour thresholds do not gain level and unarmoured defaults are 4/8', () => {
    assert.deepEqual(armourThresholds(), { major: 4, severe: 8 });
    assert.deepEqual(armourThresholds({ baseThresholds: { major: 6, severe: 13 } }), { major: 6, severe: 13 });
});
test('third standard Domain is blocked while individually granted Talents are exempt', () => {
    const domains = { steel: {}, shade: {}, poise: {}, sorte: { tradition: true } };
    const existing = [{ domain: 'steel' }, { domain: 'shade' }];
    assert.ok(talentAccess({ domain: 'poise', existing, domains }));
    assert.equal(talentAccess({ domain: 'poise', granted: true, existing, domains }), null);
    assert.equal(talentAccess({ domain: 'sorte', tradition: 'sorte', existing, domains }), null);
    assert.ok(talentAccess({ domain: 'sorte', tradition: '', existing, domains }));
    assert.equal(talentAccess({ domain: 'poise', existing: [{ domain: 'steel' }, { domain: 'shade', granted: true }], domains }), null);
});
test('character-sheet advancement slots are tracked separately for each level range', () => {
    const history = [{ choices: [{ type: 'evasion', phase: 1 }, { type: 'trait', phase: 1 }] }];
    assert.equal(advancementAvailable('evasion', 1, 5, history), false);
    assert.equal(advancementAvailable('evasion', 2, 5, history), true);
    assert.equal(advancementAvailable('evasion', 3, 5, history), false);
    assert.equal(advancementAvailable('talent', 1, 5, history), true);
});
test('Intrigue uses 3/2/1/0 Goal ticks and 3/2/1/0 Patience loss', () => {
    assert.deepEqual(['successHope', 'successFear', 'failureHope', 'failureFear'].map(intrigueTicks), [3, 2, 1, 0]);
    assert.deepEqual(['failureFear', 'failureHope', 'successFear', 'successHope'].map(pitfallTicks), [3, 2, 1, 0]);
    assert.equal(traitCount(-1), 1); assert.equal(traitCount(0), 0); assert.equal(traitCount(3), 3);
});
