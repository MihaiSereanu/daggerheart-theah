"""Package this fork for extraction into Foundry's Data/systems directory."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json
import sys

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'system.json').read_text(encoding='utf-8'))
output = root / 'dist' / f"{manifest['id']}-{manifest['version']}.zip"
output.parent.mkdir(exist_ok=True)
files = [root / name for name in ['system.json', 'README.md', 'LICENSE']]
files.extend(root / name for name in ['VALIDATION.md'] if (root / name).is_file())
pack_root = root / ('dist/staged-packs' if '--staged' in sys.argv else 'packs')
directories = ['build', 'styles', 'assets', 'templates', 'lang']
for directory in directories:
    files.extend(p for p in (root / directory).rglob('*') if p.is_file() and p.suffix != '.less' and p.name not in ['LOCK', 'LOG', 'LOG.old'] and not p.name.endswith('.map'))
with ZipFile(output, 'w', ZIP_DEFLATED, compresslevel=6) as archive:
    for file in files:
        archive.write(file, manifest['id'] + '/' + file.relative_to(root).as_posix())
    archive.write(pack_root / 'LICENSE', manifest['id'] + '/packs/LICENSE')
    for pack in manifest['packs']:
        for file in (pack_root / pack['name']).rglob('*'):
            if file.is_file() and file.name not in ['LOCK', 'LOG', 'LOG.old']:
                archive.write(file, manifest['id'] + '/' + pack['path'] + '/' + file.name)
with ZipFile(output) as archive:
    assert archive.testzip() is None
    assert f"{manifest['id']}/system.json" in archive.namelist()
    assert not any('node_modules' in name or 'license.json' in name for name in archive.namelist())
print(f"Created {output} ({output.stat().st_size:,} bytes)")
