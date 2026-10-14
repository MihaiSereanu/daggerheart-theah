import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
/* global Actor, CONFIG, game, getComputedStyle */

const errors = [];
const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.HEART_DAGGER_CHROMIUM
        ?? 'C:/Users/Mike/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe'
});
try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:30101', { waitUntil: 'domcontentloaded' });
    await page.locator('input[name="username"]').fill('Gamemaster');
    await page.locator('button[name="join"]').click();
    await page.waitForFunction(() => game.ready);

    const fixture = await page.evaluate(async () => {
        const old = game.actors.find(actor => actor.name === 'Header UI Validation');
        if (old) await old.delete();
        const actor = await Actor.create({ name: 'Header UI Validation', type: 'character' });
        const load = async (packName, name) => {
            const pack = game.packs.get(`daggerheart-theah.${packName}`);
            const entry = (await pack.getDocuments()).find(document => document.name === name);
            const data = entry.toObject();
            delete data._id;
            data._stats.compendiumSource = entry.uuid;
            return actor.createEmbeddedDocuments('Item', [data]);
        };
        await load('archetypes', 'Sorcerer');
        await actor.update({ 'system.tradition': 'porte', 'system.spellcastingTrait': 'instinct', 'system.xp': 10 });
        await load('talents', 'Blood Walkway');
        actor.sheet.render({ force: true });
        return { id: actor.id, sheet: actor.sheet.id };
    });
    const sheet = page.locator(`[id="${fixture.sheet}"]`);
    await sheet.waitFor();
    const header = await sheet.evaluate(element => {
        const input = element.querySelector('.heart-xp-control input');
        const label = element.querySelector('.heart-xp-control label');
        const row = element.querySelector('.heart-resource-row');
        const icon = element.querySelector('.heart-xp-control .heart-advance i');
        const domain = element.querySelector('.domains-section .domain img');
        const inputStyle = getComputedStyle(input);
        const labelStyle = getComputedStyle(label);
        const rowStyle = getComputedStyle(row);
        const domainStyle = getComputedStyle(domain);
        return {
            inputWidth: input.getBoundingClientRect().width,
            inputHeight: input.getBoundingClientRect().height,
            labelDisplay: labelStyle.display,
            labelAlign: labelStyle.alignItems,
            labelFontSize: labelStyle.fontSize,
            labelFontWeight: labelStyle.fontWeight,
            rowMarginBottom: rowStyle.marginBottom,
            advanceIcon: icon?.className,
            toolbarAdvance: element.querySelectorAll('.heart-actions [data-action="levelManagement"]').length,
            domainFilter: domainStyle.filter,
            domainSrc: domain.getAttribute('src'),
            domainSize: [domain.naturalWidth, domain.naturalHeight]
        };
    });
    assert.ok(header.inputWidth <= 42);
    assert.ok(header.inputHeight <= 24);
    assert.ok(['flex', 'inline-flex'].includes(header.labelDisplay));
    assert.equal(header.labelAlign, 'center');
    assert.equal(header.labelFontSize, '14px');
    assert.equal(header.labelFontWeight, '600');
    assert.equal(header.rowMarginBottom, '7px');
    assert.match(header.advanceIcon, /fa-angles-up/);
    assert.equal(header.toolbarAdvance, 0);
    assert.equal(header.domainFilter, 'none');
    assert.match(header.domainSrc, /blood-cells-vessel-red-orange\.webp$/);
    assert.ok(header.domainSize.every(value => value > 0));

    await sheet.locator('.domains-section .domain img').hover();
    await page.locator('#tooltip .heart-domain-tooltip').waitFor();
    await page.mouse.move(1100, 900);
    await sheet.screenshot({ path: 'src/validation-header-ui.png' });

    const talentRow = sheet.locator('.items-sidebar-list').getByText('Blood Walkway', { exact: true });
    await talentRow.waitFor();
    const itemContainer = talentRow.locator('xpath=ancestor::*[@data-item-id][1]');
    await itemContainer.locator('img').hover();
    await page.locator('#tooltip .dh-card.domainCard').waitFor();
    const card = await page.locator('#tooltip .dh-card.domainCard').evaluate(element => {
        const banner = element.querySelector('.trim .type');
        const label = banner.querySelector('span');
        return {
            label: label.textContent.trim(),
            bannerWidth: banner.getBoundingClientRect().width,
            labelWidth: label.getBoundingClientRect().width,
            overflow: label.scrollWidth > label.clientWidth,
            iconFilter: getComputedStyle(element.querySelector('.domain-card-banner .domain-icon')).filter
        };
    });
    assert.equal(card.label, 'Talent');
    assert.equal(card.overflow, false);
    assert.equal(card.iconFilter, 'none');
    await page.locator('#tooltip .dh-card.domainCard').screenshot({ path: 'src/validation-talent-card.png' });

    const actorTypes = await page.evaluate(id => ({
        models: Object.keys(CONFIG.Actor.dataModels),
        manifest: Object.keys(game.system.documentTypes.Actor),
        storedTalentType: game.actors.get(id).items.find(item => item.name === 'Blood Walkway').system.type
    }), fixture.id);
    assert.deepEqual(actorTypes.models.sort(), ['adversary', 'character', 'environment', 'party']);
    assert.deepEqual(actorTypes.manifest.sort(), ['adversary', 'character', 'environment', 'party']);
    assert.equal(actorTypes.storedTalentType, 'spell');

    await page.evaluate(async id => {
        const actor = game.actors.get(id);
        await actor.sheet.close({});
        await actor.delete();
    }, fixture.id);
    assert.deepEqual(errors, []);
    const report = { foundry: '14.367', header, card, actorTypes, browserErrors: errors };
    fs.writeFileSync('src/validation-header-followup-report.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
} finally {
    await browser.close();
}

