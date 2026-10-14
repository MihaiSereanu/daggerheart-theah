import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
let errors = 0;
for (const file of ['daggerheart.mjs', ...walk('module'), ...walk('tools')].filter(f => /\.mjs$/.test(f))) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status) { console.error(result.stderr); errors++; }
}
if (errors) process.exit(1);
console.log('All JavaScript syntax checks passed.');
