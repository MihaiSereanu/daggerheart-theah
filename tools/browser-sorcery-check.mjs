import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const errors = [];
const report = {};
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Users/Mike/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
try {
page.on('pageerror', error => { errors.push(error.message); console.error(error.stack); });
await page.goto('http://127.0.0.1:30101', { waitUntil: 'domcontentloaded' });
await page.locator('input[name="username"]').fill('Gamemaster');
await page.locator('button[name="join"]').click();
await page.waitForFunction(() => game.ready);

async function startCreation(name, archetype, specialisation) {
    const id = await page.evaluate(async name => {
        const old = game.actors.find(a => a.name === name); if (old) await old.delete();
        const actor = await Actor.create({ name, type: 'character' });
        await actor.sheet.render({ force: true });
        window.sorceryCreation = actor.sheet.setupCharacter();
        return actor.id;
    }, name);
    await page.locator('select[name="archetype"]').selectOption({ label: archetype });
    await page.locator('.heart-dialog button[data-action="apply"]').last().click();
    await page.locator('input[name="experience1"]').waitFor();
    if (specialisation) await page.locator('select[name="specialisation"]').selectOption({ label: specialisation });
    for (const [trait, value] of Object.entries({ brawn: '2', charm: '1a', finesse: '1b', instinct: '0', wits: '-1' })) {
        await page.locator(`select[name="${trait}"]`).selectOption(value);
    }
    await page.locator('input[name="experience1"]').fill('Scholar');
    await page.locator('input[name="experience2"]').fill('Traveller');
    await page.locator('.heart-dialog button[data-action="apply"]').last().click();
    await page.locator('select[name="talentDomain"]').waitFor();
    return id;
}
async function finishEquipment() {
    await page.locator('select[name="weaponLoadout"]').waitFor();
    assert.match(await page.locator('.heart-equipment-reminder').innerText(), /baseline Dagger/);
    await page.locator('select[name="twoHandedWeapon"]').selectOption({ label: 'Greatsword' });
    await page.getByRole('button', { name: 'Create Character', exact: true }).last().click();
}
const beforeCreation = await page.evaluate(() => game.messages.size);
const cancelled = await startCreation('Sorcery Cancel Validation', 'Commander');
assert.equal(await page.evaluate(id => game.actors.get(id).items.size, cancelled), 0);
await page.locator('.heart-dialog button[data-action="close"]').last().click();
await page.evaluate(() => window.sorceryCreation);
await page.waitForFunction(() => !document.querySelector('.heart-dialog'));
assert.equal(await page.evaluate(id => game.actors.get(id).items.size, cancelled), 0);
await page.evaluate(id => game.actors.get(id).delete(), cancelled);
report.cancelledCreation = 'No items or resources changed before the starting Talent is confirmed.';

const sorcerer = await startCreation('Sorcery Validation', 'Sorcerer', 'Porte');
assert.equal(await page.evaluate(id => game.actors.get(id).items.size, sorcerer), 0);
assert.deepEqual(await page.locator('select[name="talentDomain"] option').allTextContents(), ['Porte']);
await page.locator('select[name="talent"]').selectOption({ label: 'Blood Portal' });
await page.locator('[data-preview="talent"] .content-link').first().waitFor();
assert.ok((await page.locator('[data-preview="talent"]').innerText()).includes('Blood Portal'));
await page.getByRole('button', { name: 'Continue', exact: true }).last().click();
await finishEquipment();
await page.evaluate(() => window.sorceryCreation);
await page.waitForFunction(() => !document.querySelector('.heart-dialog'));
report.sorcerer = await page.evaluate(id => {
    const actor = game.actors.get(id), weapon = actor.items.find(i => i.system.sorcerous);
    return { archetype: actor.system.class.value.name, tradition: actor.system.tradition,
        talents: actor.items.filter(i => i.type === 'domainCard').map(i => i.name),
        weapon: { name: weapon.name, type: weapon.type, equipped: weapon.system.equipped,
            trait: weapon.system.attack.roll.trait, range: weapon.system.attack.range,
            damage: weapon.system.attack.getDamageFormula(), magical: weapon.system.attack.damage.main.type.has('magical') } };
}, sorcerer);
assert.equal(report.sorcerer.archetype, 'Sorcerer');
assert.equal(report.sorcerer.tradition, 'porte');
assert.deepEqual(report.sorcerer.talents, ['Blood Portal']);
assert.deepEqual(report.sorcerer.weapon, { name: 'Sorcerous Attack', type: 'weapon', equipped: false, trait: 'instinct', range: 'far', damage: '1d6 + 0', magical: true });
assert.equal(await page.evaluate(() => game.messages.size), beforeCreation);
const sheetId = await page.evaluate(id => game.actors.get(id).sheet.id, sorcerer);
const actorSheet = page.locator(`[id="${sheetId}"]`);
await actorSheet.locator('[data-action="sorcerousAttack"]').count().then(count => assert.equal(count, 0));
assert.equal(await actorSheet.locator('.heart-controls [data-action="learnTalent"]').count(), 0);
await page.evaluate(id => game.actors.get(id).sheet.changeTab('loadout', 'primary'), sorcerer);
await actorSheet.locator('.loadout legend [data-action="learnTalent"]').waitFor();
await actorSheet.locator('.loadout legend [data-action="learnTalent"]').click();
await page.locator('select[name="talentDomain"]').waitFor();
await page.locator('select[name="talentDomain"]').selectOption('lore');
await page.locator('[data-preview="talent"] p:not(.heart-choice-link)').first().waitFor();
await page.locator('.heart-dialog button[data-action="close"]').last().click();
await page.waitForFunction(() => !document.querySelector('.heart-dialog'));
report.learnTalentPlacement = 'Talents heading only; Domain filter and linked rules preview work.';

await page.evaluate(async () => {
    const config = game.settings.get('core', 'uiConfig');
    await game.settings.set('core', 'uiConfig', { ...config, colorScheme: { interface: 'light', applications: 'light' } });
    return getComputedStyle(document.querySelector('#interface')).colorScheme;
});
await actorSheet.locator('[data-tooltip="#domain#porte"]').hover();
await page.locator('#tooltip .heart-domain-tooltip .content-link').first().waitFor();
report.tooltip = await page.locator('#tooltip').evaluate(element => ({
    rawMarkup: element.innerText.includes('@UUID['), links: element.querySelectorAll('.content-link').length,
    broken: element.querySelectorAll('.content-link.broken').length,
    scheme: getComputedStyle(element).colorScheme, background: getComputedStyle(element).backgroundColor,
    linkColor: getComputedStyle(element.querySelector('.content-link')).color,
    linkBackground: getComputedStyle(element.querySelector('.content-link')).backgroundColor
}));
assert.equal(report.tooltip.rawMarkup, false); assert.equal(report.tooltip.links, 5); assert.equal(report.tooltip.broken, 0);
assert.equal(report.tooltip.scheme, 'light');
assert.equal(report.tooltip.linkColor, 'rgb(36, 35, 51)');
assert.equal(report.tooltip.linkBackground, 'rgb(227, 222, 209)');
await page.locator('#tooltip').screenshot({ path: 'src/validation-domain-tooltip.png' });
await page.mouse.move(1000, 900);
await actorSheet.screenshot({ path: 'src/validation-sorcerer-talents.png' });
await actorSheet.locator('[data-tooltip="#domain#porte"]').hover();
await page.locator('#tooltip .heart-domain-tooltip').waitFor();
await page.evaluate(() => game.tooltip.lockTooltip());
await page.locator('.locked-tooltip .content-link').filter({ hasText: 'Blood Portal' }).last().click();
await page.waitForFunction(() => [...foundry.applications.instances.values()].some(app => app.rendered && app.document?.name === 'Blood Portal'));
await page.evaluate(async () => {
    game.tooltip.dismissLockedTooltips();
    for (const app of foundry.applications.instances.values()) if (app.rendered && app.document?.name === 'Blood Portal') await app.close({});
});
report.tooltip.linkOpensTalent = true;

await page.evaluate(id => { void game.actors.get(id).sheet.constructor.DEFAULT_OPTIONS.actions.heartRite.call(game.actors.get(id).sheet); }, sorcerer);
await page.locator('select[name="scope"]').waitFor();
assert.equal(await page.locator('input[name="effect"], input[name="helpers"]').count(), 0);
assert.equal((await page.locator('input[name="bonus"]').locator('..').innerText()).trim(), 'Bonus');
await page.locator('input[name="bonus"]').fill('3');
await page.locator('select[name="scope"]').selectOption('2');
const beforeRite = await page.evaluate(() => game.messages.size);
await page.locator('.heart-dialog button[data-action="apply"]').last().click();
await page.locator('button[data-action="submitRoll"]').waitFor();
await page.locator('button[data-action="submitRoll"]').click();
await page.waitForFunction(before => game.messages.size === before + 1, beforeRite);
report.rite = await page.evaluate(id => ({ stress: game.actors.get(id).system.resources.stress.value,
    totalMessages: game.messages.size, message: game.messages.contents.at(-1).toObject() }), sorcerer);
assert.equal(report.rite.stress, 2); assert.equal(report.rite.totalMessages, beforeRite + 1);
assert.equal(report.rite.message.rolls.length, 1);
assert.ok(JSON.stringify(report.rite.message).includes('Bonus'));
delete report.rite.message;
await page.evaluate(id => { void game.actors.get(id).sheet.constructor.DEFAULT_OPTIONS.actions.heartRite.call(game.actors.get(id).sheet); }, sorcerer);
await page.locator('select[name="scope"]').selectOption('1');
await page.locator('.heart-dialog button[data-action="apply"]').last().click();
await page.waitForFunction(() => !document.querySelector('select[name="scope"]'));
assert.equal(await page.evaluate(() => game.messages.size), beforeRite + 1);
report.rite.minorMessages = 0;

report.dynamicWeapon = await page.evaluate(async id => {
    const actor = game.actors.get(id);
    await actor.update({ 'system.tradition': 'hexenwerk', 'system.traits.wits.value': 2 });
    const weapon = actor.items.find(i => i.system.sorcerous);
    return { trait: weapon.system.attack.roll.trait, damage: weapon.system.attack.getDamageFormula(), count: actor.items.filter(i => i.system.sorcerous).length };
}, sorcerer);
assert.deepEqual(report.dynamicWeapon, { trait: 'wits', damage: '1d6 + 2', count: 1 });
const beforeAttack = await page.evaluate(() => game.messages.size);
await page.evaluate(id => { const weapon = game.actors.get(id).items.find(i => i.system.sorcerous); window.sorceryAttack = weapon.system.attack.use(new MouseEvent('click')); }, sorcerer);
await page.locator('button[data-action="submitRoll"]').waitFor();
await page.locator('button[data-action="submitRoll"]').click();
await page.evaluate(() => window.sorceryAttack);
assert.equal(await page.evaluate(() => game.messages.size), beforeAttack + 1);
report.attack = await page.evaluate(() => {
    const message = game.messages.contents.at(-1);
    return { title: message.system.title, type: message.type, damageButton: Boolean(message.system.hasDamage), rolls: message.rolls.length };
});
assert.ok(report.attack.title.includes('Sorcerous Attack')); assert.equal(report.attack.rolls, 1);
report.beastform = await page.evaluate(async id => {
    const actor = game.actors.get(id);
    const form = (await game.packs.get('daggerheart-theah.beastforms').getDocuments()).find(item => item.name === 'Agile Scout');
    const data = form.toObject(); delete data._id;
    await actor.createEmbeddedDocuments('Item', [data]);
    const weapon = actor.items.find(item => item.system.sorcerous);
    const before = game.messages.size;
    await weapon.system.attack.use(new MouseEvent('click'));
    return { active: !!actor.system.activeBeastform, available: actor.system.isItemAvailable(weapon), messages: game.messages.size - before,
        dialogs: document.querySelectorAll('button[data-action="submitRoll"]').length };
}, sorcerer);
assert.deepEqual(report.beastform, { active: true, available: false, messages: 0, dialogs: 0 });

const commander = await startCreation('Commander Talent Validation', 'Commander');
const domains = await page.locator('select[name="talentDomain"] option').evaluateAll(options => options.map(option => option.value));
assert.equal(domains.length, 8); assert.ok(!domains.includes('porte'));
await page.locator('select[name="talentDomain"]').selectOption('lore');
await page.getByRole('button', { name: 'Continue', exact: true }).last().click();
await finishEquipment();
await page.evaluate(() => window.sorceryCreation);
await page.waitForFunction(() => !document.querySelector('.heart-dialog'));
report.commander = await page.evaluate(id => {
    const actor = game.actors.get(id), talent = actor.items.find(i => i.type === 'domainCard');
    return { archetype: actor.system.class.value.name, domain: talent.system.domain, granted: talent.system.granted, weapon: actor.items.some(i => i.system.sorcerous) };
}, commander);
assert.deepEqual(report.commander, { archetype: 'Commander', domain: 'lore', granted: true, weapon: false });

// Reload exercises the GM-ready grant and proves it remains a single weapon.
await page.evaluate(async id => {
    const actor = game.actors.get(id);
    await actor.deleteEmbeddedDocuments('Item', actor.items.filter(i => i.system.sorcerous).map(i => i.id));
}, sorcerer);
await page.reload(); await page.waitForFunction(() => game.ready);
await page.waitForFunction(id => game.actors.get(id).items.some(i => i.system.sorcerous), sorcerer);
assert.equal(await page.evaluate(id => game.actors.get(id).items.filter(i => i.system.sorcerous).length, sorcerer), 1);
report.existingSorcererGrant = 'passed';
const drag = await page.evaluate(async () => {
    const previous = game.actors.find(actor => actor.name === 'Sorcerer Drop Validation'); if (previous) await previous.delete();
    const actor = await Actor.create({ name: 'Sorcerer Drop Validation', type: 'character' });
    const rapier = (await game.packs.get('daggerheart-theah.weapons').getDocuments()).find(item => item.name === 'Rapier');
    const data = rapier.toObject(); delete data._id; data.system.equipped = true;
    await actor.createEmbeddedDocuments('Item', [data]);
    const archetype = (await game.packs.get('daggerheart-theah.archetypes').getDocuments()).find(item => item.name === 'Sorcerer');
    await actor.sheet._onDropItem(new MouseEvent('drop'), archetype);
    return { id: actor.id, primary: actor.system.primaryWeapon.name, grants: actor.items.filter(item => item.system.sorcerous).length,
        equipped: actor.items.find(item => item.system.sorcerous).system.equipped };
});
assert.equal(drag.primary, 'Rapier'); assert.equal(drag.grants, 1); assert.equal(drag.equipped, false);
report.dragSorcerer = drag;
// Two clients of the same GM must not create two grants on login.
await page.evaluate(async id => {
    const actor = game.actors.get(id);
    await actor.deleteEmbeddedDocuments('Item', actor.items.filter(item => item.system.sorcerous).map(item => item.id));
}, drag.id);
const second = await browser.newPage();
second.on('pageerror', error => errors.push(error.message));
await second.goto('http://127.0.0.1:30101', { waitUntil: 'domcontentloaded' });
await second.locator('input[name="username"]').fill('Gamemaster');
await Promise.all([page.reload(), second.locator('button[name="join"]').click()]);
await Promise.all([page.waitForFunction(() => game.ready), second.waitForFunction(() => game.ready)]);
await page.waitForFunction(id => game.actors.get(id).items.some(item => item.system.sorcerous), drag.id);
await second.waitForFunction(id => game.actors.get(id).items.some(item => item.system.sorcerous), drag.id);
assert.equal(await page.evaluate(id => game.actors.get(id).items.filter(item => item.system.sorcerous).length, drag.id), 1);
assert.equal(await second.evaluate(id => game.actors.get(id).items.filter(item => item.system.sorcerous).length, drag.id), 1);
await second.close();
report.multipleClientGrant = 'One weapon on both clients.';
await page.evaluate(id => game.actors.get(id).delete(), drag.id);
await page.evaluate(async ids => { for (const id of ids) await game.actors.get(id).delete(); }, [sorcerer, commander]);
assert.deepEqual(errors, []);
report.browserErrors = errors;
fs.writeFileSync('src/validation-sorcery-report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
