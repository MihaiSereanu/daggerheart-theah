import assert from 'node:assert/strict';
import test from 'node:test';
import {
    applySystemDialogStyle,
    SYSTEM_DIALOG_CLASSES,
    systemDialogClasses
} from '../module/heart-dagger/dialog-style.mjs';

test('system DialogV2 styling uses the Adversary Builder classes', () => {
    assert.deepEqual(SYSTEM_DIALOG_CLASSES, ['daggerheart', 'dh-style', 'dialog']);
    assert.deepEqual(systemDialogClasses(['heart-dialog', 'dh-style']), [
        'daggerheart', 'dh-style', 'dialog', 'heart-dialog'
    ]);

    const applied = [];
    applySystemDialogStyle({ classList: { add: (...classes) => applied.push(...classes) } });
    assert.deepEqual(applied, SYSTEM_DIALOG_CLASSES);
});
