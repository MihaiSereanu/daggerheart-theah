import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const baseline = pack => Object.values(fs.readdirSync(`dist/feature-repair-baseline/${pack}`)
    .filter(name => name.endsWith('.json')).map(name => JSON.parse(fs.readFileSync(`dist/feature-repair-baseline/${pack}/${name}`))));
const oldFeatures = baseline('features'), oldClasses = baseline('archetypes'), oldEnvironments = baseline('environments');
const index = JSON.parse(fs.readFileSync('src/manuscript-index.json')).packs;
const total = Object.values(index).reduce((a, b) => a + b, 0);
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Users/Mike/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', e => { errors.push(e.message); console.error(e.stack); });
await page.goto('http://127.0.0.1:30101');
await page.locator('input[name="username"]').fill('Gamemaster');
await page.locator('button[name="join"]').click();
await page.waitForFunction(() => game.ready);
const generated = await page.evaluate(async () => {
    const documents = (await Promise.all(game.packs.map(p => p.getDocuments()))).flat();
    const features = [...documents, ...documents.flatMap(d => d.items?.contents ?? [])].filter(d => d.type === 'feature');
    const parsed = game.packs.get('daggerheart-theah.features').contents;
    const inOut = parsed.find(f => f.name === 'In & Out'), focus = parsed.find(f => f.name === 'Singular Focus');
    await inOut.sheet.render({ force: true });
    return { total: documents.length, invalid: documents.filter(d => d.invalid).map(d => d.name), features: features.length,
        empty: features.filter(f => !f.system.description?.replace(/<[^>]+>/g, '').trim()).map(f => f.name),
        bogus: features.filter(f => ['Spend a Hope', 'Mark a Stress'].includes(f.name)).map(f => f.name),
        inOut: inOut.system.description, focus: focus.system.description, sheet: inOut.sheet.id };
});
assert.equal(generated.total, total); assert.equal(generated.features, 424);
assert.deepEqual(generated.invalid, []); assert.deepEqual(generated.empty, []); assert.deepEqual(generated.bogus, []);
assert.match(generated.inOut, /<strong>Spend a Hope<\/strong> to ask the GM/);
assert.match(generated.focus, /<strong>Mark a Stress<\/strong> and make an attack/);
assert.equal((generated.focus.match(/<li>/g) ?? []).length, 3);
await page.locator(`[id="${generated.sheet}"]`).screenshot({ path: 'src/validation-in-out.png' });
const fixtures = await page.evaluate(async ({ oldFeatures, oldClasses, oldEnvironments }) => {
    for (const actor of game.actors.filter(a => a.name.startsWith('Feature Repair '))) await actor.delete();
    await Item.deleteDocuments(game.items.filter(i => i.getFlag('daggerheart-theah', 'featureRepairFixture')).map(i => i.id));
    const source = data => {
        const result = foundry.utils.deepClone(data); delete result._id; delete result._key; result.folder = null;
        result._stats = { compendiumSource: `Compendium.daggerheart-theah.${data.type === 'class' ? 'archetypes' : 'features'}.Item.${data._id}` };
        return result;
    };
    const createPair = async (name, featureID, fragmentID) => {
        const actor = await Actor.create({ name: `Feature Repair ${name}`, type: 'character' });
        const archetype = oldClasses.find(c => c.name === name);
        const data = source(archetype); data.system.features = [];
        const [parent] = await actor.createEmbeddedDocuments('Item', [data]);
        for (const id of [featureID, fragmentID]) {
            const feature = source(oldFeatures.find(f => f._id === id));
            feature.system.granter = { id: parent.id, type: 'class', identifier: parent.sourceUuid };
            await actor.createEmbeddedDocuments('Item', [feature]);
        }
        await parent.update({ 'system.features': archetype.system.features });
        return { actor: actor.id, parent: parent.id, featureID, fragmentID };
    };
    const assassin = await createPair('Assassin', '4ec05b6c4e48a19e', '4be70c5d9babd50e');
    const hunter = await createPair('Hunter', '2932cae6984759d6', '2391e828cade7ee0');
    const solo = await Actor.create({ name: 'Feature Repair Solo', type: 'character' });
    const fragment = source(oldFeatures.find(f => f._id === '4be70c5d9babd50e'));
    fragment.system.resource = { type: 'simple', value: 1, max: '3', progression: 'increasing' };
    const [soloItem] = await solo.createEmbeddedDocuments('Item', [fragment]);
    const custom = await Actor.create({ name: 'Feature Repair Custom', type: 'character' });
    const edited = source(oldFeatures.find(f => f._id === '2932cae6984759d6'));
    edited.name = 'My Custom Focus'; edited.system.description = '<p>My house rules remain.</p>';
    const [customItem] = await custom.createEmbeddedDocuments('Item', [edited]);
    const environment = foundry.utils.deepClone(oldEnvironments.find(e => e.name === 'The Walkway'));
    const originalID = environment._id; delete environment._id; delete environment._key;
    environment.name = 'Feature Repair Environment'; environment._stats = { compendiumSource: `Compendium.daggerheart-theah.environments.Actor.${originalID}` };
    const environmentActor = await Actor.create(environment);
    const worldData = source(oldFeatures.find(f => f._id === '2391e828cade7ee0'));
    worldData.flags = { 'daggerheart-theah': { featureRepairFixture: true } };
    const world = await Item.create(worldData);
    return { assassin, hunter, solo: solo.id, soloItem: soloItem.id, custom: custom.id, customItem: customItem.id, environment: environmentActor.id, world: world.id };
}, { oldFeatures, oldClasses, oldEnvironments });
await page.reload(); await page.waitForFunction(() => game.ready);
await page.waitForFunction(ids => {
    const actor = game.actors.get(ids.assassin.actor);
    return actor?.items.some(i => i.name === 'In & Out' && i.system.description?.includes('Spend a Hope'))
        && !actor.items.some(i => i.name === 'Spend a Hope')
        && !game.actors.get(ids.hunter.actor)?.items.some(i => i.name === 'Mark a Stress')
        && game.actors.get(ids.solo)?.items.get(ids.soloItem)?.name === 'In & Out'
        && game.actors.get(ids.environment)?.items.get('777b8df21a17352a')?.name === 'The Walkway Hungers - Action';
}, fixtures);
const repaired = await page.evaluate(async ids => {
    const pairs = [ids.assassin, ids.hunter].map(pair => {
        const actor = game.actors.get(pair.actor), parent = actor.items.get(pair.parent);
        return { features: actor.items.filter(i => i.type === 'feature').map(i => i.name),
            links: parent._source.system.features.map(f => f.item),
            rules: actor.items.find(i => i.type === 'feature').system.description };
    });
    const solo = game.actors.get(ids.solo).items.get(ids.soloItem);
    const custom = game.actors.get(ids.custom).items.get(ids.customItem);
    const environment = game.actors.get(ids.environment).items.get('777b8df21a17352a');
    const world = game.items.get(ids.world);
    await game.actors.get(ids.assassin.actor).sheet.render({ force: true });
    return { pairs, solo: { name: solo.name, source: solo.sourceUuid, count: solo.system.resource.value, max: solo.system.resource.max, description: solo.system.description },
        custom: { name: custom.name, description: custom.system.description }, environment: { name: environment.name, description: environment.system.description },
        world: { name: world.name, description: world.system.description }, sheet: game.actors.get(ids.assassin.actor).sheet.id };
}, fixtures);
assert.deepEqual(repaired.pairs.map(p => p.features), [['In & Out'], ['Singular Focus']]);
assert.equal(repaired.pairs[0].links.length, 3); assert.equal(repaired.pairs[1].links.length, 3);
assert.ok(repaired.pairs.every(p => !p.links.some(s => /4be70c5d9babd50e|2391e828cade7ee0/.test(s))));
assert.equal(repaired.solo.name, 'In & Out'); assert.equal(repaired.solo.count, 1); assert.equal(repaired.solo.max, '3');
assert.ok(repaired.solo.source.endsWith('4ec05b6c4e48a19e'));
assert.deepEqual(repaired.custom, { name: 'My Custom Focus', description: '<p>My house rules remain.</p>' });
assert.equal(repaired.environment.name, 'The Walkway Hungers - Action');
assert.match(repaired.environment.description, /Countdown \(Loop 14\)/);
assert.equal(repaired.world.name, 'Singular Focus'); assert.match(repaired.world.description, /Mark a Stress/);
await page.locator(`[id="${repaired.sheet}"]`).screenshot({ path: 'src/validation-feature-repair.png' });
await page.reload(); await page.waitForFunction(() => game.ready);
assert.equal(await page.evaluate(ids => game.actors.get(ids.assassin.actor).items.filter(i => i.type === 'feature').length, fixtures), 1);
await page.evaluate(async ids => {
    await Actor.deleteDocuments([ids.assassin.actor, ids.hunter.actor, ids.solo, ids.custom, ids.environment]);
    await Item.deleteDocuments([ids.world]);
}, fixtures);
assert.deepEqual(errors, []);
fs.writeFileSync('src/validation-feature-report.json', JSON.stringify({ foundry: '14.367', documents: total, features: 424, emptyFeatures: generated.empty,
    bogusFeatures: generated.bogus, legacyRepairs: 'passed', customRules: 'preserved', counterValues: 'preserved', idempotence: 'passed', browserErrors: errors }, null, 2));
console.log('FEATURE AUDIT:', total, 'documents, 424 Features, no empty or split-cost entries. Existing copies and links repaired; custom data preserved.');
await browser.close();
