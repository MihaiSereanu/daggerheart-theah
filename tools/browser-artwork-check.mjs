import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { EQUIPMENT_ICONS } from './equipment-icons.mjs';
import { GROUP_ICONS } from './manuscript-icons.mjs';
const artwork = JSON.parse(fs.readFileSync('module/config/manuscript-artwork.json'));
const documentCount = Object.values(JSON.parse(fs.readFileSync('src/manuscript-index.json')).packs).reduce((a, b) => a + b, 0);
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Users/Mike/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', e => { errors.push(e.message); console.error(e.stack); });
await page.goto('http://127.0.0.1:30101');
await page.locator('input[name="username"]').fill('Gamemaster');
await page.locator('button[name="join"]').click();
await page.waitForFunction(() => game.ready);
const validation = await page.evaluate(async ({ equipment, groups, artwork }) => {
    const packs = (await Promise.all(game.packs.map(p => p.getDocuments()))).flat();
    const documents = [...packs, ...packs.flatMap(d => d.items?.contents ?? [])];
    const errors = [];
    for (const entry of documents) {
        if (entry.invalid) errors.push(`Invalid ${entry.name}`);
        const art = artwork[entry.uuid];
        if (art && entry.img !== art.current) errors.push(`Old art ${entry.name}`);
        if (['armor', 'weapon'].includes(entry.type)) {
            const icon = equipment[entry.name.replace(/^Dracheneisen /, '')];
            if (entry.img !== icon) errors.push(`Equipment art ${entry.name}`);
            if (entry.type === 'weapon' && entry.system.attack.img !== icon) errors.push(`Attack art ${entry.name}`);
            if (entry.effects.some(e => e.img !== icon)) errors.push(`Effect art ${entry.name}`);
        }
        if (entry.system.resource?.label === 'Uses spent') errors.push(`Old counter label ${entry.name}`);
        if (entry.type === 'domainCard' && ['porte', 'sanderis'].includes(entry.system.domain)) {
            if (entry.img !== groups[entry.system.domain === 'porte' ? 'Porte' : 'Sanderis']) errors.push(`Tradition art ${entry.name}`);
        }
    }
    const grid = document.createElement('div'); grid.id = 'artwork-validation';
    grid.style.cssText = 'position:fixed;inset:20px;z-index:99999;background:#eee5d5;color:#1b1726;display:grid;grid-template-columns:repeat(8,1fr);gap:10px;padding:20px;overflow:auto;align-content:start;';
    for (const [name, src] of Object.entries({ ...equipment, Porte: groups.Porte, Sanderis: groups.Sanderis })) {
        const cell = document.createElement('div'); cell.style.cssText = 'text-align:center;font:14px sans-serif;';
        const img = document.createElement('img'); img.src = src; img.width = 100; img.height = 100;
        const label = document.createElement('div'); label.textContent = name; cell.append(img, label); grid.append(cell);
    }
    document.body.append(grid);
    await Promise.all([...grid.querySelectorAll('img')].map(img => img.decode()));
    return { documents: packs.length, equipment: packs.filter(d => ['armor', 'weapon'].includes(d.type)).length, iconUpdates: Object.keys(artwork).length, errors };
}, { equipment: EQUIPMENT_ICONS, groups: GROUP_ICONS, artwork });
assert.deepEqual(validation.errors, []);
assert.equal(validation.documents, documentCount); assert.equal(validation.equipment, 63);
await page.locator('#artwork-validation').screenshot({ path: 'src/validation-equipment-icons.png' });
await page.evaluate(() => document.querySelector('#artwork-validation').remove());
const ids = await page.evaluate(async artwork => {
    await Item.deleteDocuments(game.items.filter(i => i.name.startsWith('Artwork Validation ')).map(i => i.id));
    const source = async (pack, name) => (await game.packs.get(`daggerheart-theah.${pack}`).getDocuments()).find(d => d.name === name);
    const ids = [];
    for (const [pack, name] of [['weapons', 'Longsword'], ['armors', 'Dracheneisen Gambeson Armor'], ['specialisations', 'Porte'], ['domains', 'Sanderis'], ['talents', 'Gentle Words']]) {
        const doc = await source(pack, name);
        const data = doc.toObject(); delete data._id; data.folder = null; data._stats.compendiumSource = doc.uuid;
        const art = artwork[doc.uuid];
        if (art) {
            data.img = art.previous[0];
            if (data.system.attack) data.system.attack.img = art.previousAttack[0];
            for (const effect of data.effects) effect.img = art.previous[0];
        }
        if (name === 'Gentle Words') { data.system.resource.label = 'Uses spent'; data.system.resource.value = 1; }
        const item = await Item.create({ ...data, name: `Artwork Validation ${name}` });
        ids.push({ id: item.id, source: doc.uuid, description: item.system.description });
    }
    const doc = await source('weapons', 'Longsword');
    const data = doc.toObject(); delete data._id; data.folder = null; data._stats.compendiumSource = doc.uuid;
    data.img = 'icons/weapons/swords/sword-guard-red.webp';
    const custom = await Item.create({ ...data, name: 'Artwork Validation Custom' });
    return { items: ids, custom: custom.id };
}, artwork);
await page.reload(); await page.waitForFunction(() => game.ready);
await page.waitForFunction(({ ids, artwork }) => ids.items.every(({ id, source }) => {
    const item = game.items.get(id), art = artwork[source];
    return art ? item?.img === art.current : item?.system.resource?.label === 'Uses';
}), { ids, artwork });
const migration = await page.evaluate(({ ids, artwork }) => {
    const errors = [];
    for (const { id, source, description } of ids.items) {
        const item = game.items.get(id), art = artwork[source];
        if (item.system.description !== description) errors.push(`Rules changed ${item.name}`);
        if (art && item.effects.some(e => e.img !== art.current)) errors.push(`Old effect art ${item.name}`);
        if (art && item.system.attack && item.system.attack.img !== art.current) errors.push(`Old attack art ${item.name}`);
        if (!art && item.system.resource.value !== 1) errors.push('Counter value changed');
    }
    if (game.items.get(ids.custom).img !== 'icons/weapons/swords/sword-guard-red.webp') errors.push('Custom image changed');
    return errors;
}, { ids, artwork });
assert.deepEqual(migration, []); assert.deepEqual(errors, []);
await page.evaluate(async ids => { await Item.deleteDocuments([...ids.items.map(i => i.id), ids.custom]); }, ids);
fs.writeFileSync('src/validation-artwork-report.json', JSON.stringify({ foundry: '14.367', ...validation, iconDecoding: 'passed', legacyPresentation: 'passed', customArtwork: 'preserved', counters: 'preserved', browserErrors: errors }, null, 2));
console.log('ARTWORK:', validation, 'Legacy icons and Uses label updated; custom artwork, rules, and counter values preserved.');
await browser.close();
