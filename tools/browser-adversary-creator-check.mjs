import assert from 'node:assert/strict';
import { chromium } from 'playwright';
/* global game, ui */

const errors = [];
const actorName = 'Adversary Creator Validation';
const url = process.env.HEART_DAGGER_URL ?? 'http://127.0.0.1:30101';
const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.HEART_DAGGER_CHROMIUM
        ?? 'C:/Users/Mike/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe'
});

let actorId;
try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const login = page.locator('input[name="username"]');
    if (await login.count()) {
        await login.fill('Gamemaster');
        await page.locator('button[name="join"]').click();
    }
    await page.waitForFunction(() => globalThis.game?.ready === true);
    await page.evaluate(async name => {
        const old = game.actors.find(actor => actor.name === name);
        if (old) await old.delete();
        ui.actors.render({ force: true });
    }, actorName);

    const createButton = page.locator('.open-adversary-creator');
    await createButton.waitFor();
    const buttonLayout = await createButton.evaluate(button => {
        const actions = button.parentElement;
        const actor = actions.querySelector('.create-entry');
        const folder = actions.querySelector('.create-folder');
        const browser = actions.querySelector('.open-compendium-browser');
        const entries = Array.from(actions.children);
        const boxes = [actor, folder, browser, button].map(element => element.getBoundingClientRect());
        return {
            order: [actor, folder, browser, button].map(element => entries.indexOf(element)),
            sameFirstRow: boxes[0].top === boxes[1].top,
            browserOnSecondRow: boxes[2].top > boxes[0].top,
            creatorOnThirdRow: boxes[3].top > boxes[2].top,
            browserFullWidth: boxes[2].width > boxes[0].width * 1.8,
            creatorFullWidth: boxes[3].width > boxes[0].width * 1.8
        };
    });
    assert.deepEqual(buttonLayout.order, [0, 1, 2, 3]);
    assert.equal(buttonLayout.sameFirstRow, true);
    assert.equal(buttonLayout.browserOnSecondRow, true);
    assert.equal(buttonLayout.creatorOnThirdRow, true);
    assert.equal(buttonLayout.browserFullWidth, true);
    assert.equal(buttonLayout.creatorFullWidth, true);

    await createButton.click();
    const dialog = page.locator('#adversary-creator');
    await dialog.waitFor();
    await dialog.locator('[name="adversaryType"]').selectOption('bruiser');
    await dialog.locator('[data-action="chooseType"]').click();

    const ranges = await dialog.evaluate(element => Object.fromEntries(
        Array.from(element.querySelectorAll('[data-stat-key]')).map(input => [input.dataset.statKey, {
            type: input.type,
            min: input.min,
            max: input.max,
            value: input.value
        }])
    ));
    assert.deepEqual(ranges.difficulty, { type: 'range', min: '12', max: '15', value: '14' });
    assert.deepEqual(ranges.majorThreshold, { type: 'range', min: '7', max: '9', value: '8' });
    assert.deepEqual(ranges.severeThreshold, { type: 'range', min: '14', max: '18', value: '16' });
    assert.deepEqual(ranges.hitPoints, { type: 'range', min: '5', max: '7', value: '6' });
    assert.deepEqual(ranges.stress, { type: 'range', min: '3', max: '4', value: '4' });
    assert.deepEqual(ranges.attackModifier, { type: 'range', min: '0', max: '2', value: '1' });

    await dialog.locator('[name="name"]').fill(actorName);
    await dialog.locator('[name="champion"]').check();
    await dialog.locator('[name="description"]').fill('A temporary validation adversary.');
    await dialog.locator('[name="motivesAndTactics"]').fill('Test, verify, clean up');
    await dialog.locator('[name="experience"]').fill('Watcher');
    await dialog.locator('[data-action="addExperience"]').click();
    await dialog.locator('[name="experience"]').nth(1).fill('Tracker');

    const championPreview = await dialog.evaluate(element => ({
        difficulty: element.querySelector('[data-stat-output="difficulty"]').textContent,
        hitPoints: element.querySelector('[data-stat-output="hitPoints"]').textContent,
        stress: element.querySelector('[data-stat-output="stress"]').textContent,
        attack: element.querySelector('[data-stat-output="attackModifier"]').textContent,
        damage: element.querySelector('[data-damage-output]').textContent
    }));
    assert.deepEqual(championPreview, {
        difficulty: '19', hitPoints: '8', stress: '6', attack: '+6', damage: '1d12+7'
    });

    await dialog.locator('[data-action="toggleFeaturePicker"]').click();
    await dialog.locator('[data-feature-search]').fill('Frenzy');
    const frenzy = dialog.locator('[data-feature-result]').filter({ hasText: 'Frenzy' }).first();
    const preview = frenzy.locator('.adversary-feature-preview');
    await frenzy.locator('[data-action="toggleFeaturePreview"]').click();
    assert.equal(await preview.isVisible(), true);
    assert.equal(await dialog.locator('.adversary-feature-chip').filter({ hasText: 'Frenzy' }).count(), 0);
    await frenzy.locator('[data-action="toggleFeaturePreview"]').click();
    assert.equal(await preview.isVisible(), false);
    await frenzy.locator('[data-action="selectFeature"]').click();
    assert.equal(await preview.isVisible(), false);
    await frenzy.locator('[data-action="toggleFeaturePreview"]').click();
    assert.equal(await frenzy.locator('.adversary-feature-preview').isVisible(), true);
    assert.equal(await dialog.locator('.adversary-feature-chip').filter({ hasText: 'Frenzy' }).count(), 1);

    await dialog.locator('.adversary-feature-chip').filter({ hasText: 'Frenzy' })
        .locator('[data-action="removeFeature"]').click();
    assert.equal(await dialog.locator('.adversary-feature-chip').filter({ hasText: 'Frenzy' }).count(), 0);
    await frenzy.locator('[data-action="selectFeature"]').click();

    await dialog.locator('button[type="submit"]').click();
    await page.waitForFunction(name => game.actors.some(actor => actor.name === name), actorName);
    const actorData = await page.evaluate(name => {
        const actor = game.actors.find(candidate => candidate.name === name);
        return {
            id: actor.id,
            type: actor.type,
            classification: actor.system.classification,
            adversaryType: actor.system.type,
            difficulty: actor.system.difficulty,
            thresholds: actor.system.damageThresholds.toObject?.() ?? actor.system.damageThresholds,
            hitPoints: actor.system.resources.hitPoints.max,
            stress: actor.system.resources.stress.max,
            attack: actor.system.attack.roll.bonus,
            damage: actor.system.attack.damage.main.value.custom.formula,
            experiences: Object.values(actor.system.experiences).map(experience => ({
                name: experience.name,
                value: experience.value
            })),
            features: actor.items.map(item => ({
                name: item.name,
                form: item.system.featureForm,
                description: item.system.description
            }))
        };
    }, actorName);
    actorId = actorData.id;
    assert.equal(actorData.type, 'adversary');
    assert.equal(actorData.classification, 'champion');
    assert.equal(actorData.adversaryType, 'bruiser');
    assert.equal(actorData.difficulty, 19);
    assert.deepEqual(actorData.thresholds, { major: 13, severe: 21 });
    assert.equal(actorData.hitPoints, 8);
    assert.equal(actorData.stress, 6);
    assert.equal(actorData.attack, '6');
    assert.equal(actorData.damage, '1d12+7');
    assert.deepEqual(actorData.experiences, [
        { name: 'Watcher', value: 0 },
        { name: 'Tracker', value: 0 }
    ]);
    assert.equal(actorData.features.length, 1);
    assert.equal(actorData.features[0].name, 'Frenzy');
    assert.equal(actorData.features[0].form, 'reaction');
    assert.match(actorData.features[0].description, /the adversary/i);
    assert.deepEqual(errors, []);

    console.log(JSON.stringify({ buttonLayout, ranges, championPreview, actorData, browserErrors: errors }, null, 2));
} finally {
    if (actorId) {
        const pages = browser.contexts().flatMap(context => context.pages());
        const page = pages[0];
        await page?.evaluate(async id => {
            const actor = game.actors.get(id);
            if (!actor) return;
            await actor.sheet.close({});
            await actor.delete();
        }, actorId).catch(() => {});
    }
    await browser.close();
}
