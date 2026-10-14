// Generate a targeted migration from the preserved, prior compiled packs.
import fs from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const load = async (folder, pack) => {
    const documents = [];
    for (const name of await fs.readdir(path.join(root, folder, pack))) {
        if (!name.endsWith('.json')) continue;
        const entry = JSON.parse(await fs.readFile(path.join(root, folder, pack, name), 'utf8'));
        if (entry._key?.startsWith('!folders!')) continue;
        documents.push(entry);
    }
    return documents;
};
const repairs = {};
const uuid = (pack, entry, type = 'Item') => `Compendium.daggerheart-theah.${pack}.${type}.${entry._id}`;
for (const pack of ['features', 'environments']) {
    const current = await load('src/packs', pack);
    const previous = await load('dist/feature-repair-baseline', pack);
    const compare = (entry, old, source) => {
        if (entry.system.description === old.system.description && entry.name === old.name) return;
        repairs[source] = { name: entry.name, previousNames: [old.name], description: entry.system.description,
            previousDescriptions: [old.system.description], target: source };
    };
    for (const entry of current) {
        const old = previous.find(e => e._id === entry._id);
        if (!old) continue;
        const source = uuid(pack, entry, pack === 'environments' ? 'Actor' : 'Item');
        if (pack === 'features') compare(entry, old, source);
        for (const feature of entry.items ?? []) {
            const oldFeature = old.items.find(f => f._id === feature._id);
            compare(feature, oldFeature, `${source}.Item.${feature._id}`);
        }
    }
}
const features = await load('src/packs', 'features');
const previous = await load('dist/feature-repair-baseline', 'features');
const archetypes = await load('dist/feature-repair-baseline', 'archetypes');
for (const [fragmentID, featureID] of [['4be70c5d9babd50e', '4ec05b6c4e48a19e'], ['2391e828cade7ee0', '2932cae6984759d6']]) {
    const old = previous.find(f => f._id === fragmentID), entry = features.find(f => f._id === featureID);
    repairs[uuid('features', old)] = { name: entry.name, previousNames: [old.name], description: entry.system.description,
        previousDescriptions: [old.system.description], target: uuid('features', entry), fragment: true };
}
for (const [source, repair] of Object.entries(repairs)) {
    const archetype = archetypes.find(a => a.system.features.some(f => f.item === source));
    if (archetype) repair.previousNames.push(`${archetype.name}: ${repair.previousNames[0]}`);
}
await fs.writeFile(path.join(root, 'module/config/manuscript-feature-repairs.json'), JSON.stringify(repairs, null, 2) + '\n');
console.log(`Recorded ${Object.keys(repairs).length} targeted Feature repairs, including both split cost fragments.`);
