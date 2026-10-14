import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const expected = JSON.parse(fs.readFileSync('src/manuscript-index.json')).packs;
const errors = [];
const browser = await chromium.launch({ headless: true, executablePath: process.env.HEART_DAGGER_CHROMIUM ?? 'C:/Users/Mike/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on('pageerror', error => { errors.push(error.message); console.error('PAGE ERROR:', error.stack); });
page.on('console', message => { if (message.type() === 'error') console.error('CONSOLE:', message.text().slice(0, 1200)); });
await page.goto('http://127.0.0.1:30101', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('select, button', { timeout: 20000 });
console.log('URL:', page.url());
await page.locator('input[name="username"]').fill('Gamemaster');
await page.locator('button[name="join"]').click();
await page.waitForFunction(() => game.ready || document.body.innerText.includes('Invalid'), { timeout: 30000 });
console.log('READY:', await page.evaluate(() => ({ ready: game.ready, system: game.system?.id, user: game.user?.name, notifications: document.querySelector('#notifications')?.innerText })));
await page.evaluate(() => { void CONFIG.Actor.documentClass.createDialog({}, {}, {}); });
const actorTypeSelect = page.locator('.actor-create select[name="type"]');
await actorTypeSelect.waitFor();
assert.deepEqual(
    await actorTypeSelect.locator('option').evaluateAll(options =>
        options.map(option => option.value).filter(Boolean)),
    ['character', 'adversary', 'environment', 'party']
);
await page.locator('.actor-create [data-action="close"]').click();
const packResults = await page.evaluate(async () => {
    const results = {};
    for (const pack of game.packs) {
        const docs = await pack.getDocuments();
        results[pack.metadata.name] = { count: docs.length, invalid: docs.filter(d => d.invalid).map(d => d.name) };
    }
    return results;
});
for (const [pack, result] of Object.entries(packResults)) {
    assert.equal(result.count, expected[pack]);
    assert.deepEqual(result.invalid, []);
}
console.log('PACKS:', packResults);
const organization = await page.evaluate(async () => {
    const pack = game.packs.get('daggerheart-theah.talents');
    const talents = await pack.getDocuments();
    const domains = await game.packs.get('daggerheart-theah.domains').getDocuments();
    const folders = pack.folders.contents;
    const lore = folders.find(f => f.name === 'Lore');
    const entry = domains.find(d => d.name === 'Lore');
    entry.sheet.render({ force: true });
    pack.render(true);
    return {
        noJournalPack: !game.packs.has('daggerheart-theah.journals'),
        folderCount: folders.length,
        everyTalentGrouped: talents.every(t => t.folder?.name === CONFIG.DH.DOMAIN.domains[t.system.domain]?.label),
        loreTalentCount: talents.filter(t => t.folder?.id === lore.id).length,
        domainLists: domains.every(d => {
            const html = document.createElement('div'); html.innerHTML = d.system.description;
            return html.children.length === 2 && html.children[0].tagName === 'H2'
                && html.children[0].textContent === d.name && html.children[1].tagName === 'UL'
                && html.querySelectorAll('li').length === talents.filter(t => t.folder?.name === d.name).length;
        }),
        loreSheet: entry.sheet.id,
        talentDirectory: pack.apps[0].id
    };
});
assert.equal(organization.noJournalPack, true);
assert.equal(organization.folderCount, 18);
assert.equal(organization.everyTalentGrouped, true);
assert.equal(organization.loreTalentCount, 10);
assert.equal(organization.domainLists, true);
await page.locator(`[id="${organization.loreSheet}"] .content-link`).first().waitFor({ state: 'visible' });
await page.locator(`[id="${organization.talentDirectory}"]`).waitFor({ state: 'visible' });
await page.locator(`[id="${organization.talentDirectory}"]`).screenshot({ path: 'src/validation-talent-folders.png' });
await page.evaluate(async () => {
    for (const app of foundry.applications.instances.values()) {
        if (app.rendered && (app.document || app.id.startsWith('Compendium-'))) await app.close({});
    }
});
console.log('ORGANIZATION:', organization);
const presentation = await page.evaluate(async () => {
    const armors = await game.packs.get('daggerheart-theah.armors').getDocuments();
    const adversaries = await game.packs.get('daggerheart-theah.adversaries').getDocuments();
    const environments = await game.packs.get('daggerheart-theah.environments').getDocuments();
    const bandit = adversaries.find(a => a.name === 'Bandit Archer');
    bandit.sheet.render({ force: true });
    return {
        noUnarmouredItem: !armors.some(a => /unarmou?red/i.test(a.name)),
        normalizedNames: [...adversaries, ...environments].every(a => a.name !== a.name.toUpperCase()),
        shortDescriptions: [...adversaries, ...environments].every(a => !/Difficulty|Thresholds|Motives|Impulses|Features|ATK:/.test(a.system.description)),
        banditDescription: bandit.system.description,
        attackIcons: adversaries.every(a => /^icons\/.+\.webp$/.test(a.system.attack?.img)),
        banditSheet: bandit.sheet.id,
        banditAttackIcon: bandit.system.attack.img
    };
});
assert.equal(presentation.noUnarmouredItem, true);
assert.equal(presentation.normalizedNames, true);
assert.equal(presentation.shortDescriptions, true);
assert.match(presentation.banditDescription, /^<p><em>A lanky bandit striking from cover with a shortbow\.<\/em><\/p>/);
assert.equal(presentation.attackIcons, true);
const banditSheet = page.locator(`[id="${presentation.banditSheet}"]`);
await banditSheet.waitFor({ state: 'visible' });
await banditSheet.locator(`img[src="${presentation.banditAttackIcon}"]`).evaluate(async img => { await img.decode(); });
await banditSheet.screenshot({ path: 'src/validation-bandit.png' });
await page.evaluate(async () => { for (const app of foundry.applications.instances.values()) if (app.rendered && app.document?.name === 'Bandit Archer') await app.close({}); });
console.log('PRESENTATION:', presentation);
console.log('ACTOR:', await page.evaluate(async () => {
    const previous = game.actors.find(a => a.name === 'Validation Hero');
    if (previous) await previous.delete();
    const actor = await Actor.create({ name: 'Validation Hero', type: 'character' });
    const load = async (pack, name) => {
        const docs = await game.packs.get(`daggerheart-theah.${pack}`).getDocuments();
        const entry = docs.find(e => e.name === name);
        const source = entry.toObject(); delete source._id; source._stats.compendiumSource = entry.uuid;
        return actor.createEmbeddedDocuments('Item', [source]);
    };
    await load('archetypes', 'Soldier');
    await load('specialisations', 'Bodyguard');
    await load('origins', 'Castille');
    await load('communities', 'Village');
    await load('weapons', 'Rapier');
    await load('armors', 'Leather Armor');
    await actor.update({ 'system.traits.finesse.value': 2 });
    await actor.items.find(i => i.name === 'Rapier').update({ 'system.equipped': true });
    await actor.items.find(i => i.name === 'Leather Armor').update({ 'system.equipped': true });
    actor.sheet.render({ force: true });
    return { traits: Object.keys(actor.system.traits), hp: actor.system.resources.hitPoints, stress: actor.system.resources.stress, evasion: actor.system.evasion, thresholds: actor.system.damageThresholds, weaponDamage: actor.system.primaryWeapon.system.attack.getDamageFormula(), features: actor.system.features.map(f => f.name), sheet: actor.sheet.constructor.name };
}));
await page.waitForSelector('.character-header-sheet', { timeout: 15000 });
await page.screenshot({ path: 'src/validation-character.png', fullPage: true });
console.log('SHEET TEXT:', (await page.locator('.character-header-sheet').innerText()).slice(0, 1600));
const mechanics = await page.evaluate(async () => {
    const actor = game.actors.find(a => a.name === 'Validation Hero');
    const talents = await game.packs.get('daggerheart-theah.talents').getDocuments();
    const add = async entry => {
        const source = entry.toObject(); delete source._id; source._stats.compendiumSource = entry.uuid;
        return actor.createEmbeddedDocuments('Item', [source]);
    };
    for (const entry of talents.filter(t => t.system.domain === 'steel').slice(0, 6)) await add(entry);
    await add(talents.find(t => t.system.domain === 'shade'));
    const blocked = await add(talents.find(t => t.system.domain === 'poise'));
    const sixAvailable = actor.system.domainCards.total.length;
    await actor.update({ 'system.levelData.level.current': 10, 'system.levelData.level.changed': 10 });
    const thresholds = actor.system.damageThresholds;
    const damage = actor.system.primaryWeapon.system.attack.getDamageFormula();
    const armor = actor.system.armor;
    await armor.update({ 'system.equipped': false });
    const noArmor = { thresholds: { ...actor.system.damageThresholds }, armorScore: actor.system.armorScore.max };
    await armor.update({ 'system.equipped': true });
    const castille = actor.system.evasion;
    actor.sheet.settingSheet?.render({ force: true });
    const sheets = [];
    for (const packName of ['archetypes', 'specialisations', 'talents', 'weapons', 'armors', 'adversaries', 'environments', 'beastforms']) {
        const doc = (await game.packs.get(`daggerheart-theah.${packName}`).getDocuments())[0];
        doc.sheet.render({ force: true }); sheets.push(doc.name);
    }
    return { sixAvailable, thirdDomainBlocked: blocked.length === 0, thresholdsAtLevel10: thresholds, noArmor, damageAtLevel10: damage, evasionWithCastille: castille, sheets };
});
assert.ok(mechanics.sixAvailable > 5);
assert.equal(mechanics.thirdDomainBlocked, true);
assert.deepEqual(mechanics.thresholdsAtLevel10, { major: 6, severe: 13 });
assert.deepEqual(mechanics.noArmor, { thresholds: { major: 4, severe: 8 }, armorScore: 0 });
assert.equal(mechanics.damageAtLevel10, '1d8 + 2');
assert.equal(mechanics.evasionWithCastille, 10);
console.log('MECHANICS:', mechanics);
await page.waitForTimeout(1000);
await page.evaluate(async () => { for (const app of foundry.applications.instances.values()) if (app.rendered && app.document && app.document?.name !== 'Validation Hero') await app.close({}); });
// Exercise a real DialogV2 form and its callback through the character sheet.
await page.locator('[data-action="configureCharacter"]').click();
await page.waitForSelector('input[name="xp"]');
await page.locator('input[name="xp"]').fill('75');
await page.locator('button[data-action="apply"]').last().click();
await page.waitForFunction(() => game.actors.find(a => a.name === 'Validation Hero').system.xp === 75);
console.log('DIALOG:', 'Character Options saved XP through DialogV2');
const setupSheetId = await page.evaluate(async () => {
    const old = game.actors.find(a => a.name === 'Wizard Validation'); if (old) await old.delete();
    const actor = await Actor.create({ name: 'Wizard Validation', type: 'character' });
    actor.sheet.render({ force: true });
    void actor.sheet.setupCharacter();
    return actor.sheet.id;
});
await page.waitForSelector('select[name="archetype"]');
assert.deepEqual(
    await page.locator(`[id="${setupSheetId}"] .heart-actions button`).evaluateAll(buttons =>
        buttons.slice(0, 2).map(button => button.textContent.trim())),
    ['Create Character', 'Character Options']
);
await page.locator('select[name="archetype"]').selectOption({ label: 'Assassin' });
await page.waitForFunction(() => document.querySelector('[data-preview="archetype"]')?.innerText.includes('Ambush'));
assert.ok(await page.locator('[data-preview="archetype"] li .content-link').count() >= 3);
const previewLayout = await page.locator('[data-preview="archetype"]').evaluate(element => {
    const style = getComputedStyle(element);
    return { maxHeight: style.maxHeight, overflowY: style.overflowY };
});
assert.equal(previewLayout.maxHeight, 'none');
assert.equal(previewLayout.overflowY, 'visible');
await page.screenshot({ path: 'src/validation-builder-preview.png', fullPage: true });
await page.locator('select[name="archetype"]').selectOption({ label: 'Soldier' });
await page.waitForFunction(() => document.querySelector('[data-preview="archetype"]')?.innerText.includes('Bulwark'));
await page.locator('button[data-action="apply"]').last().click();
await page.waitForSelector('input[name="experience1"]');
assert.equal(await page.locator('.heart-starting-traits-heading').textContent(), 'Choose starting Trait values');
assert.equal(await page.locator('input[name="brawn"]').count(), 0);
const startingTraitSelects = page.locator(
    'select[name="brawn"], select[name="charm"], select[name="finesse"], '
    + 'select[name="instinct"], select[name="wits"]'
);
assert.deepEqual(await startingTraitSelects.evaluateAll(selects => selects.map(select => select.value)), ['', '', '', '', '']);
await page.locator('select[name="brawn"]').selectOption('2');
assert.equal(await page.locator('select[name="charm"] option[value="2"]').isDisabled(), true);
assert.match(await page.locator('select[name="charm"] option[value="2"]').textContent(), /already selected/);
await page.locator('select[name="charm"]').selectOption('1a');
assert.equal(await page.locator('select[name="finesse"] option[value="1a"]').isDisabled(), true);
assert.equal(await page.locator('select[name="finesse"] option[value="1b"]').isDisabled(), false);
await page.locator('select[name="finesse"]').selectOption('1b');
assert.equal(await page.locator('select[name="instinct"] option[value="1a"]').isDisabled(), true);
assert.equal(await page.locator('select[name="instinct"] option[value="1b"]').isDisabled(), true);
await page.locator('select[name="instinct"]').selectOption('0');
await page.locator('select[name="wits"]').selectOption('-1');
for (const field of ['specialisation', 'origin', 'community']) {
    await page.locator(`[data-preview="${field}"] li .content-link`).first().waitFor({ state: 'visible' });
}
await page.locator('select[name="origin"]').selectOption({ label: 'Montaigne' });
await page.waitForFunction(() => document.querySelector('[data-preview="origin"]')?.innerText.includes('Flair for the Dramatic'));
await page.locator('select[name="origin"]').selectOption({ label: 'Castille' });
await page.locator('select[name="community"]').selectOption({ label: 'Village' });
await page.locator('input[name="experience1"]').fill('Veteran');
await page.locator('input[name="experience2"]').fill('Sailor');
await page.locator('button[data-action="apply"]').last().click();
await page.waitForSelector('select[name="weaponLoadout"]');
assert.match(await page.locator('.heart-equipment-reminder').innerText(), /baseline Dagger/);
assert.equal(await page.locator('section[data-loadout="twoHanded"]').isVisible(), true);
assert.equal(await page.locator('section[data-loadout="primaryAndSecondary"]').isHidden(), true);
await page.locator('select[name="weaponLoadout"]').selectOption('primaryAndSecondary');
assert.equal(await page.locator('section[data-loadout="twoHanded"]').isHidden(), true);
assert.equal(await page.locator('section[data-loadout="primaryAndSecondary"]').isVisible(), true);
await page.locator('select[name="primaryWeapon"]').selectOption({ label: 'Rapier' });
await page.locator('select[name="secondaryWeapon"]').selectOption({ label: 'Buckler' });
await page.locator('select[name="armour"]').selectOption({ label: 'Leather Armor' });
assert.equal(await page.locator('select[name="primaryWeapon"] option').allTextContents()
    .then(options => options.some(option => option.includes('Dracheneisen'))), false);
await page.getByRole('button', { name: 'Create Character', exact: true }).last().click();
await page.waitForFunction(() => game.actors.find(a => a.name === 'Wizard Validation')?.system.class.subclass);
const startingEquipment = await page.evaluate(() => {
    const actor = game.actors.find(a => a.name === 'Wizard Validation');
    return actor.items.filter(item => ['weapon', 'armor'].includes(item.type)).map(item => ({
        name: item.name,
        equipped: item.system.equipped,
        secondary: item.type === 'weapon' ? item.system.secondary : null
    }));
});
assert.deepEqual(startingEquipment, [
    { name: 'Leather Armor', equipped: true, secondary: null },
    { name: 'Rapier', equipped: true, secondary: false },
    { name: 'Buckler', equipped: true, secondary: true },
    { name: 'Dagger', equipped: false, secondary: false }
]);
await page.evaluate(async () => {
    const actor = game.actors.find(a => a.name === 'Wizard Validation');
    await actor.update({ 'system.xp': 25 });
    void actor.sheet.advanceCharacter();
});
await page.waitForSelector('input[name="experience"]');
await page.locator('input[name="experience"]').fill('Courtier');
await page.locator('button[data-action="apply"]').last().click();
await page.waitForSelector('select[name="talent"]');
await page.locator('select[name="talentDomain"]').selectOption('lore');
await page.waitForFunction(() => document.querySelector('select[name="talent"]')?.options.length === 10);
await page.locator('select[name="talent"]').selectOption({ label: 'Keen Intuition' });
await page.waitForFunction(() => {
    const preview = document.querySelector('[data-preview="talent"]');
    return preview?.querySelector('.content-link')?.textContent.includes('Keen Intuition')
        && preview.innerText.includes('Your next roll has advantage.');
});
await page.screenshot({ path: 'src/validation-talent-preview.png', fullPage: true });
await page.locator('button[data-action="apply"]').last().click();
await page.waitForFunction(() => game.actors.find(a => a.name === 'Wizard Validation').system.levelData.level.current === 2);
await page.evaluate(() => { void game.actors.find(a => a.name === 'Wizard Validation').sheet.advanceCharacter(); });
for (const type of ['hitPoint', 'stress']) {
    await page.waitForSelector('select[name="choice"]');
    await page.locator('select[name="choice"]').selectOption(`1:${type}`);
    await page.locator('button[data-action="apply"]').last().click();
}
await page.waitForFunction(() => game.actors.find(a => a.name === 'Wizard Validation').system.levelData.level.current === 3);
console.log('WIZARD:', await page.evaluate(() => {
    const s = game.actors.find(a => a.name === 'Wizard Validation').system;
    return { level: s.levelData.level.current, hp: s.resources.hitPoints.max, stress: s.resources.stress.max, experiences: Object.values(s.experiences).map(e => e.name), history: s.advancementHistory };
}));
await page.evaluate(async () => {
    const actor = game.actors.find(a => a.name === 'Wizard Validation');
    await actor.update({ 'system.resources.hitPoints.value': 3, 'system.resources.stress.value': 2 });
    await actor.toggleStatusEffect('unconscious', { active: true });
    void new game.system.api.applications.dialogs.Downtime(actor, true).render();
});
await page.waitForSelector('select[name="move0"]');
await page.locator('button[data-action="apply"]').last().click();
await page.waitForFunction(() => {
    const actor = game.actors.find(a => a.name === 'Wizard Validation');
    return actor.system.resources.hitPoints.value < 3 && actor.system.resources.stress.value < 2 && !actor.statuses.has('unconscious');
});
await page.evaluate(() => { void new game.system.api.applications.dialogs.Downtime(game.actors.find(a => a.name === 'Wizard Validation'), false).render(); });
await page.getByRole('button', { name: 'Complete Extended Rest' }).click();
await page.waitForFunction(() => {
    const s = game.actors.find(a => a.name === 'Wizard Validation').system;
    return s.resources.hitPoints.value === 0 && s.resources.stress.value === 0;
});
console.log('RECOVERY:', 'Ordinary and Extended Rest resolved; unconscious cleared after Rest.');
const uiRules = await page.evaluate(async () => {
    const actor = game.actors.find(a => a.name === 'Wizard Validation');
    const features = await game.packs.get('daggerheart-theah.features').getDocuments();
    const specialisations = await game.packs.get('daggerheart-theah.specialisations').getDocuments();
    await actor.update({ 'system.supply': 6, 'system.resources.stress.value': 0, 'system.resources.hope.value': 4, 'system.stuntUsed': false });
    const config = game.settings.get('core', 'uiConfig');
    await game.settings.set('core', 'uiConfig', { ...config, fade: { ...config.fade, opacity: 1 }, colorScheme: { interface: 'light', applications: 'light' } });
    ui.sidebar.changeTab('chat', 'primary');
    ui.sidebar.expand();
    actor.sheet.render({ force: true });
    return {
        noCountdownUI: !document.getElementById('countdowns') && !game.system.api.applications.ui.DhCountdowns,
        plainFeatures: features.every(f => !f.name.includes(':') && !f.name.includes(' / ') && !!f.folder),
        plainSpecialisations: specialisations.every(s => !/\([^)]*\)$/.test(s.name) && !!s.folder),
        sheet: actor.sheet.id,
        messagesBefore: game.messages.size
    };
});
assert.equal(uiRules.noCountdownUI, true);
assert.equal(uiRules.plainFeatures, true);
assert.equal(uiRules.plainSpecialisations, true);
const wizardSheet = page.locator(`[id="${uiRules.sheet}"]`);
assert.equal(await wizardSheet.locator('[data-action="heartIntrigue"], [data-action="heartEncounter"]').count(), 0);
assert.equal(await wizardSheet.locator('[data-action="heartStunt"]').innerText(), 'Stunt');
await wizardSheet.locator('[data-action="heartSupply"]').click();
await page.waitForFunction(before => game.messages.size === before + 1, uiRules.messagesBefore);
const supplyRules = await page.evaluate(() => {
    const actor = game.actors.find(a => a.name === 'Wizard Validation');
    const message = game.messages.contents.at(-1);
    const total = message.rolls[0].total;
    return { messageId: message.id, stress: actor.system.resources.stress.value, die: actor.system.supply, total, outcome: message.content, noSupplyDialog: !document.querySelector('select[name="mode"]') };
});
assert.equal(supplyRules.stress, 1);
assert.equal(supplyRules.die, supplyRules.total <= 2 ? 4 : 6);
assert.ok(supplyRules.outcome.includes(supplyRules.total <= 2 ? 'decreases' : 'remains'));
assert.equal(supplyRules.noSupplyDialog, true);
await page.locator(`#chat .chat-message[data-message-id="${supplyRules.messageId}"]`).waitFor({ state: 'visible' });
assert.equal(await page.locator(`#chat .chat-message[data-message-id="${supplyRules.messageId}"] .apply-buttons`).count(), 0);
await page.waitForFunction(() => document.querySelector('#notifications')?.innerText.includes('Marked 1 Stress to use Supply.'));
await wizardSheet.locator('[data-action="heartStunt"]').click();
await page.waitForSelector('select[name="trait"]');
await page.getByRole('button', { name: 'Declare Stunt' }).click();
for (let i = 0; i < 2; i++) {
    await page.locator('button[data-action="submitRoll"]').last().waitFor({ state: 'visible' });
    await page.locator('button[data-action="submitRoll"]').last().click();
}
await page.waitForSelector('select[name="index"]');
await page.getByRole('button', { name: 'Resolve', exact: true }).click();
await page.waitForFunction(() => {
    const actor = game.actors.find(a => a.name === 'Wizard Validation');
    return game.messages.contents.some(m => m.system.title === 'Stunt: chosen Action Roll' && m.system.source.actor === actor.uuid);
});
const stuntRules = await page.evaluate(() => {
    const actor = game.actors.find(a => a.name === 'Wizard Validation');
    const messages = game.messages.contents.filter(m => m.system.title === 'Stunt: chosen Action Roll' && m.system.source.actor === actor.uuid);
    const message = messages.at(-1);
    JSON.stringify(message.toObject());
    return { spent: actor.system.stuntUsed, hope: actor.system.resources.hope.value, chosenMessages: messages.length, messageId: message.id, outcome: message.rolls[0].totalLabel };
});
assert.equal(stuntRules.spent, true);
assert.ok([2, 3].includes(stuntRules.hope));
assert.equal(stuntRules.chosenMessages, 1);
await page.waitForFunction(id => {
    const card = document.querySelector(`.chat-message[data-message-id="${id}"]`);
    return card && getComputedStyle(card).backgroundImage.includes('dh-parchment-light.png')
        && getComputedStyle(card).colorScheme.includes('light');
}, stuntRules.messageId);
await page.locator('#chat').hover();
await page.locator(`#chat .chat-message[data-message-id="${stuntRules.messageId}"]`).screenshot({ path: 'src/validation-light-chat.png' });
await page.evaluate(async () => {
    const settings = new game.system.api.applications.settings.DhHomebrewSettings();
    await settings.render({ force: true }); settings.changeTab('domains', 'main');
});
await page.locator('.homebrew-settings .domain-icon').first().waitFor({ state: 'visible' });
const domainIcons = await page.locator('.homebrew-settings .domains.tab .domain-icon').evaluateAll(async icons => {
    await Promise.all(icons.map(img => img.decode()));
    return icons.map(img => ({ src: img.getAttribute('src'), filter: getComputedStyle(img).filter }));
});
assert.equal(domainIcons.length, 18);
assert.ok(domainIcons.every(img => img.src.endsWith('.webp') && img.filter === 'none'));
await page.locator('.homebrew-settings').screenshot({ path: 'src/validation-homebrew-domains.png' });
console.log('UI RULES:', { uiRules, supplyRules, stuntRules, domainIcons: domainIcons.length });
const resourceRules = await page.evaluate(async () => {
    const actor = game.actors.find(a => a.name === 'Wizard Validation');
    await actor.update({ 'system.tradition': 'sanderis', 'system.resources.favor': { value: 3, max: 7 } });
    const Cost = game.system.api.fields.ActionFields.CostField;
    const cannotPay = !Cost.hasCost.call({ actor }, [{ key: 'stress', total: 8, value: 8, enabled: true }, { key: 'hope', total: 1, value: 1, enabled: true }]);
    const maxFavour = actor.system.resources.favor.max;
    await actor.update({ 'system.resources.favor.value': 0 });
    await actor.update({ 'system.resources.favor.value': 3 });
    const refused = actor.system.resources.favor.value === 0 && actor.system.dievaTaskPending;
    await actor.update({ 'system.dievaTaskPending': false, 'system.resources.favor.value': 3 });
    const pistol = (await game.packs.get('daggerheart-theah.weapons').getDocuments()).find(w => w.name === 'Pistol');
    const pistolData = pistol.toObject(); delete pistolData._id;
    const [weapon] = await actor.createEmbeddedDocuments('Item', [pistolData]);
    const reloadCheck = await weapon.system.attack.handleReload();
    const reloadConsistent = weapon.system.reloadRequired === (reloadCheck.rollValue === 1)
        && weapon.system.resource.value === (reloadCheck.rollValue === 1 ? 0 : 1);
    await weapon.update({ 'system.reloadRequired': true, 'system.resource.value': 0 });
    const stressBeforeReload = actor.system.resources.stress.value;
    const reloadButton = { closest: () => ({ dataset: { itemId: weapon.id } }) };
    await actor.sheet.options.actions.toggleItemReload.call(actor.sheet, null, reloadButton);
    const reloadPaid = actor.system.resources.stress.value === stressBeforeReload + 1
        && !weapon.system.needsReload && weapon.system.resource.value === 1;
    const warded = (await game.packs.get('daggerheart-theah.armors').getDocuments()).find(a => a.name === 'Dracheneisen Leather Armor');
    const data = warded.toObject(); delete data._id; data._stats.compendiumSource = warded.uuid;
    const added = await actor.createEmbeddedDocuments('Item', [data]);
    await added[0].update({ 'system.equipped': true });
    const damageAfterWarding = actor.calculateDamage(15, ['physical']);
    const form = (await game.packs.get('daggerheart-theah.beastforms').getDocuments()).find(f => f.name === 'Agile Scout');
    const formData = form.toObject(); delete formData._id;
    await actor.createEmbeddedDocuments('Item', [formData]);
    return { cannotPay, maxFavour, refused, reloadConsistent, reloadPaid, damageAfterWarding, activeBeastform: !!actor.system.activeBeastform, beastformAttack: actor.system.attack.getDamageFormula() };
});
assert.equal(resourceRules.cannotPay, true);
assert.equal(resourceRules.maxFavour, 7);
assert.equal(resourceRules.refused, true);
assert.equal(resourceRules.reloadConsistent, true);
assert.equal(resourceRules.reloadPaid, true);
assert.equal(resourceRules.damageAfterWarding, 12);
assert.equal(resourceRules.activeBeastform, true);
assert.equal(resourceRules.beastformAttack, '1d6 + 2');
console.log('RESOURCE RULES:', resourceRules);
const legacy = await page.evaluate(async () => {
    const actor = game.actors.find(a => a.name === 'Wizard Validation');
    const source = (await game.packs.get('daggerheart-theah.features').getDocuments()).find(f => f.name === 'Unshakable Resolve');
    const data = source.toObject(); delete data._id; data.folder = null; data._stats.compendiumSource = source.uuid;
    const [old] = await actor.createEmbeddedDocuments('Item', [{ ...data, name: 'Montaigne: Unshakable Resolve' }]);
    const custom = await Item.create({ ...data, name: 'My Custom Feature Name' });
    const spec = (await game.packs.get('daggerheart-theah.specialisations').getDocuments()).find(s => s.name === 'Bodyguard');
    const specData = spec.toObject(); delete specData._id; specData.folder = null; specData._stats.compendiumSource = spec.uuid;
    const oldSpec = await Item.create({ ...specData, name: 'Bodyguard (Soldier)' });
    return { actorId: actor.id, featureId: old.id, customId: custom.id, specId: oldSpec.id, description: old.system.description };
});
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForFunction(ids => {
    return globalThis.game?.ready && game.actors.get(ids.actorId)?.items.get(ids.featureId)?.name === 'Unshakable Resolve'
        && game.items.get(ids.specId)?.name === 'Bodyguard';
}, legacy);
assert.equal(await page.evaluate(id => game.items.get(id).name, legacy.customId), 'My Custom Feature Name');
assert.equal(await page.evaluate(ids => game.actors.get(ids.actorId).items.get(ids.featureId).system.description, legacy), legacy.description);
await page.evaluate(async ids => { await Item.deleteDocuments([ids.customId, ids.specId]); }, legacy);
console.log('LEGACY NAMES:', 'Updated old feature and Specialisation names on reload; preserved custom names and rules.');
assert.deepEqual(errors, [], 'Browser raised errors');
fs.writeFileSync('src/validation-report.json', JSON.stringify({ foundry: '14.367', system: 'daggerheart-theah', packs: packResults, organization, presentation, mechanics, resourceRules, uiRules, supplyRules, stuntRules, domainIcons, browserErrors: errors, legacyNames: 'passed', guidedCreation: 'passed', level2And3: 'passed', ordinaryAndExtendedRest: 'passed' }, null, 2) + '\n');
await browser.close();
