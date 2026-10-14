import { compilePack } from '@foundryvtt/foundryvtt-cli';
import fs from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'system.json'), 'utf8'));
const packOption = process.argv.indexOf('--pack');
const requestedPack = packOption >= 0 ? process.argv[packOption + 1] : null;
if (packOption >= 0 && !requestedPack) throw Error('The --pack option requires a pack name');
if (requestedPack && !manifest.packs.some(pack => pack.name === requestedPack)) {
    throw Error(`Unknown pack: ${requestedPack}`);
}
// Staging permits a complete package build while a running world holds database locks.
const outputRoot = path.join(root, ...(process.argv.includes('--stage') ? ['dist', 'staged-packs'] : ['packs']));
await fs.mkdir(outputRoot, { recursive: true });
// The manuscript journal was removed from this fork's generated content.
const obsoleteJournal = path.resolve(outputRoot, 'journals');
if (!obsoleteJournal.startsWith(outputRoot + path.sep)) throw Error('Journal path escaped output directory');
await fs.rm(obsoleteJournal, { recursive: true, force: true });
await fs.copyFile(path.join(root, 'src/packs/LICENSE'), path.join(outputRoot, 'LICENSE'));
for (const pack of manifest.packs.filter(pack => !requestedPack || pack.name === requestedPack)) {
    const output = path.resolve(outputRoot, path.relative('packs', pack.path));
    if (!output.startsWith(outputRoot + path.sep)) throw Error('Pack path escaped output directory');
    await compilePack(path.join(root, 'src/packs', pack.name), output, {
        yaml: false,
        transformEntry: entry => {
            const annotate = document => {
                document._stats = {
                    ...document._stats, coreVersion: manifest.compatibility.minimum,
                    systemId: manifest.id, systemVersion: manifest.version
                };
                const children = [...(document.items ?? []), ...(document.effects ?? []), ...(document.pages ?? [])];
                for (const child of children) annotate(child);
            };
            annotate(entry);
        }
    });
    console.log(`Compiled ${pack.name}`);
}
