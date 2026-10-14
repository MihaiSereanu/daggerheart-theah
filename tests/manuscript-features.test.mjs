import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFeatureBlocks, auditFeatureBlocks } from '../tools/manuscript-feature-parser.mjs';

test('bold costs stay in heading-based Features, with all subsequent rules and lists', () => {
    const text = '##### In & Out\n\n**Spend a Hope** to find an exit.\n\n##### Singular Focus\n\n**Mark a Stress** and attack.\n\n- Locate your Focus.\n- Reroll a failed attack.\n';
    const features = parseFeatureBlocks(text);
    assert.deepEqual(features.map(f => f.name), ['In & Out', 'Singular Focus']);
    assert.match(features[0].text, /^\n\n\*\*Spend a Hope\*\* to find an exit/);
    assert.match(features[1].text, /\*\*Mark a Stress\*\* and attack/);
    assert.match(features[1].text, /- Reroll a failed attack/);
    assert.equal(auditFeatureBlocks(text, features, 'cost regression').verified, true);
});

test('punctuated bold titles work inside and outside bold; list options stay with their Feature', () => {
    const text = '#### Features\n\n**Guard.** Choose a stance.\n\n- **Defensive**. Block attacks.\n\n**Counterpunch**. Strike back.\n\n**Thick Hide:** Gain Armour.\n';
    const features = parseFeatureBlocks(text);
    assert.deepEqual(features.map(f => f.name), ['Guard', 'Counterpunch', 'Thick Hide']);
    assert.match(features[0].text, /Defensive/);
    assert.equal(auditFeatureBlocks(text, features, 'title conventions').verified, true);
});

test('misplaced NPC bold boundary separates the title from mechanics while retaining its original identity', () => {
    const text = '**The Walkway Hungers - Action: Countdown (Loop 14**). Activate the countdown.\n';
    const [feature] = parseFeatureBlocks(text);
    assert.equal(feature.name, 'The Walkway Hungers - Action');
    assert.equal(feature.identityName, 'The Walkway Hungers - Action: Countdown (Loop 14');
    assert.equal(feature.text, 'Countdown (Loop 14). Activate the countdown.\n');
    assert.equal(auditFeatureBlocks(text, [feature], 'NPC formatting').verified, true);
});

test('the manuscript audit rejects empty Features and truncated bodies', () => {
    const empty = '##### Missing Rules\n';
    assert.throws(() => auditFeatureBlocks(empty, parseFeatureBlocks(empty), 'empty regression'), /Empty Feature/);
    const text = '##### Complete\n\nFirst paragraph.\n\nSecond paragraph.\n';
    assert.throws(() => auditFeatureBlocks(text, [{ name: 'Complete', text: 'First paragraph.' }], 'truncation'), /Feature rules/);
});
