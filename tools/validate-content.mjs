import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'system.json')));
const index = JSON.parse(fs.readFileSync(path.join(root, 'src/manuscript-index.json')));
const featureAudit = JSON.parse(fs.readFileSync(path.join(root, 'src/feature-audit-report.json')));
assert.equal(featureAudit.sourceHash, index.sourceHash);
assert.ok(featureAudit.verified.every(context => context.verified));
assert.equal(
    featureAudit.features + featureAudit.directSourceFeatures.length + (featureAudit.derivedFeatureDocuments ?? 0),
    featureAudit.totalFeatureDocuments
);
assert.equal(manifest.id, 'daggerheart-theah');
assert.deepEqual(Object.keys(manifest.documentTypes.Actor).sort(), ['adversary', 'character', 'environment', 'party']);
const sourcePath = process.env.HEART_DAGGER_MANUSCRIPT ?? path.join(root, 'Manuscript.md');
if (fs.existsSync(sourcePath)) {
    assert.equal(index.sourceHash, createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex'));
} else {
    console.warn('Manuscript source unavailable: validated the generated snapshot against its saved source audit. Set HEART_DAGGER_MANUSCRIPT to check an external source.');
}
const references = new Set(), entries = [];
for (const pack of manifest.packs) {
    assert.equal(pack.system, manifest.id);
    const files = fs.readdirSync(path.join(root, 'src/packs', pack.name)).filter(f => f.endsWith('.json'));
    const documents = [], folders = new Set();
    for (const file of files) {
        const entry = JSON.parse(fs.readFileSync(path.join(root, 'src/packs', pack.name, file)));
        assert.equal(entry._id.length, 16);
        assert.ok(entry._key?.startsWith('!'));
        if (entry._key.startsWith('!folders!')) {
            assert.equal(entry.type, pack.type);
            assert.ok(!folders.has(entry._id), `Duplicate folder ${entry.name}`);
            folders.add(entry._id);
            continue;
        }
        documents.push(entry);
        const uuid = `Compendium.${manifest.id}.${pack.name}.${pack.type}.${entry._id}`;
        assert.ok(!references.has(uuid), `Duplicate ${uuid}`); references.add(uuid);
        entries.push(entry);
    }
    assert.equal(documents.length, index.packs[pack.name]);
    assert.equal(folders.size, index.folders?.[pack.name] ?? 0);
    for (const document of documents) if (document.folder) assert.ok(folders.has(document.folder), document.name);
}
for (const entry of entries) {
    for (const feature of [entry, ...(entry.items ?? [])].filter(i => i.type === 'feature')) {
        assert.ok(feature.system.description?.replace(/<[^>]*>/g, '').trim(), `Empty Feature: ${feature.name}`);
        assert.ok(!['Spend a Hope', 'Mark a Stress'].includes(feature.name), `Cost split into a Feature: ${feature.name}`);
    }
    const serialized = JSON.stringify(entry);
    assert.ok(!serialized.includes('Compendium.daggerheart.'), entry.name);
    assert.ok(!serialized.includes('systems/daggerheart/'), entry.name);
    for (const reference of serialized.matchAll(/Compendium\.daggerheart-theah\.[\w-]+\.(?:Item|Actor|JournalEntry)\.[a-zA-Z0-9]{16}/g)) assert.ok(references.has(reference[0]), `Unresolved ${reference[0]}`);
    for (const asset of serialized.matchAll(/systems\/daggerheart-theah\/[^"\\<>]+\.(?:svg|webp|png)/g)) assert.ok(fs.existsSync(path.join(root, asset[0].replace('systems/daggerheart-theah/', ''))), `Missing asset ${asset[0]}`);
}
assert.equal(index.packs.archetypes, 12); assert.equal(index.packs.specialisations, 31);
assert.equal(index.packs.loot, 60); assert.equal(index.packs.consumables, 60);
assert.ok(!manifest.packs.some(p => ['classes', 'subclasses', 'ancestries', 'transformations', 'rolltables', 'journals'].includes(p.name)));
console.log(`Validated ${entries.length} manuscript documents, references, assets, and package isolation.`);
