import fs from 'node:fs/promises';
import path from 'node:path';
import { buildAdversaryFeatures } from './adversary-features.mjs';

const root = path.resolve(import.meta.dirname, '..');
const sourceRoot = path.join(root, 'src', 'packs');
const adversaryRoot = path.join(sourceRoot, 'adversaries');
const outputRoot = path.join(sourceRoot, 'adversary-features');
const adversaries = [];

for (const file of (await fs.readdir(adversaryRoot)).filter(file => file.endsWith('.json')).sort()) {
    const entry = JSON.parse(await fs.readFile(path.join(adversaryRoot, file), 'utf8'));
    if (entry._key?.startsWith('!actors!')) adversaries.push(entry);
}

const features = buildAdversaryFeatures(adversaries);
await fs.mkdir(outputRoot, { recursive: true });
for (const file of await fs.readdir(outputRoot)) if (file.endsWith('.json')) await fs.rm(path.join(outputRoot, file));
for (const feature of features) {
    feature._key = `!items!${feature._id}`;
    await fs.writeFile(path.join(outputRoot, `${feature._id}.json`), JSON.stringify(feature, null, 2) + '\n');
}

const manifestPath = path.join(root, 'system.json');
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const pack = {
    name: 'adversary-features', label: 'Adversary Features', system: manifest.id,
    path: 'packs/adversary-features', type: 'Item', private: false,
    ownership: { PLAYER: 'OBSERVER', GAMEMASTER: 'OWNER', ASSISTANT: 'OWNER' }
};
const adversaryIndex = manifest.packs.findIndex(entry => entry.name === 'adversaries');
manifest.packs = manifest.packs.filter(entry => entry.name !== pack.name);
manifest.packs.splice(adversaryIndex + 1, 0, pack);
for (const folder of manifest.packFolders ?? []) {
    folder.packs = folder.packs.filter(name => name !== pack.name);
    if (folder.name === 'Heart & Dagger') {
        const index = folder.packs.indexOf('adversaries');
        folder.packs.splice(index + 1, 0, pack.name);
    }
}
await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 4) + '\n');

const indexPath = path.join(root, 'src', 'manuscript-index.json');
const index = JSON.parse(await fs.readFile(indexPath, 'utf8'));
index.packs['adversary-features'] = features.length;
await fs.writeFile(indexPath, JSON.stringify(index, null, 2) + '\n');

const auditPath = path.join(root, 'src', 'feature-audit-report.json');
const audit = JSON.parse(await fs.readFile(auditPath, 'utf8'));
audit.derivedFeatureDocuments = features.length;
audit.totalFeatureDocuments = audit.features + audit.directSourceFeatures.length + features.length;
await fs.writeFile(auditPath, JSON.stringify(audit, null, 2) + '\n');

console.log(`Extracted ${features.length} unique adversary features from ${adversaries.length} adversaries.`);

