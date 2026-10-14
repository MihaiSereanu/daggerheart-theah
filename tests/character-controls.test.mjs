import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const controls = readFileSync('templates/heart-dagger/controls.hbs', 'utf8');

test('character setup hides XP, next-level, and Supply summaries', () => {
    const hiddenDuringSetup = controls.match(
        /{{#unless document\.system\.needsCharacterSetup}}([\s\S]*?){{\/unless}}/
    )?.[1] ?? '';

    assert.match(hiddenDuringSetup, /class="heart-xp-control"/);
    assert.match(hiddenDuringSetup, /Next level:/);
    assert.match(hiddenDuringSetup, /Supply: {{heartSupply}}/);
    assert.match(controls, /{{#if document\.system\.needsCharacterSetup}}<button[^>]+>Create Character<\/button>{{\/if}}/);
});
