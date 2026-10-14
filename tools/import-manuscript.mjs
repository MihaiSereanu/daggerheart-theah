import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { marked } from 'marked';
import { applyFeatureIcons } from './manuscript-icons.mjs';
import { configureCounters } from './manuscript-counters.mjs';
import { applyEquipmentIcons } from './equipment-icons.mjs';
import { parseFeatureBlocks, auditFeatureBlocks } from './manuscript-feature-parser.mjs';
import { attackIcon } from '../module/helpers/attack-icon.mjs';
import { buildAdversaryFeatures } from './adversary-features.mjs';

// Rebuild only this fork's generated compendiums. IDs derive from pack and name.
const root = path.resolve(import.meta.dirname, '..');
const manuscript = await fs.readFile(process.env.HEART_DAGGER_MANUSCRIPT ?? path.join(root, 'Manuscript.md'), 'utf8');
const lines = manuscript.split(/\r?\n/);
const id = text => createHash('sha256').update(text).digest('hex').slice(0, 16);
const plain = text => text.replace(/[*_]/g, '').trim();
const key = name => name.toLowerCase().replace(/[^a-z0-9]/g, '');
const titleCase = name => name.toLowerCase().replace(/[a-z]+(?:['\u2019][a-z]+)*/g, (word, offset) =>
    offset > 0 && /^(a|an|and|at|by|for|in|of|on|or|the|to|with)$/.test(word)
        ? word : word[0].toUpperCase() + word.slice(1));
const clean = text => text.split(/\r?\n/).filter(line =>
    !/^\s*(\{\{|\}\}|\\(?:page|column)|:+$|!\[|<!--|-->)/.test(line)
).join('\n').replace(/\s*::\s*$/gm, '').replace(/^(\*\*[^\n]+)\n(?=\*\*)/gm, '$1\n\n');
const html = text => marked.parse(clean(text));
const heading = (name, from = 0) => lines.findIndex((line, i) => i >= from && (/^#+ /.test(line) || /^<h[12]/.test(line)) && plain(line.replace(/^#+ /, '').replace(/<[^>]*>/g, '')) === name);
const section = (start, end) => lines.slice(start, end).join('\n');
const icon = file => `systems/daggerheart-theah/assets/icons/documents/items/${file}.svg`;
const packs = new Map();
const folders = new Map();
const nameAliases = {};
const folderFor = (pack, name, parent = null) => {
    const folderID = id(`folder:${pack}:${parent ?? ''}:${name}`);
    if (!folders.has(pack)) folders.set(pack, []);
    if (!folders.get(pack).some(f => f._id === folderID)) folders.get(pack).push({ _id: folderID, name, type: 'Item', folder: parent, sorting: 'a', sort: 0 });
    return folderID;
};
const add = (pack, name, type, text, system = {}, extras = {}) => {
    const entry = {
        _id: id(`${pack}:${name}`), name, type, img: icon('laurels'),
        system: { description: html(text), attribution: { source: 'Heart & Dagger Manuscript' }, ...system },
        effects: [], ...extras
    };
    if (!packs.has(pack)) packs.set(pack, []);
    if (packs.get(pack).some(e => e._id === entry._id)) throw Error(`Duplicate ${pack}: ${name}`);
    packs.get(pack).push(entry);
    return entry;
};
const passive = (entry, changes) => entry.effects.push({ _id: id(`${entry._id}:passive`), name: entry.name, type: 'base', transfer: true, img: entry.img, system: { changes: changes.map(([key, value]) => ({ type: 'add', key, value, phase: 'initial' })) } });
const uuid = (pack, entry, type = 'Item') => `Compendium.daggerheart-theah.${pack}.${type}.${entry._id}`;
const addFeature = (group, name, text, system = {}, specialisation = null) => {
    const rootFolder = folderFor('features', group);
    const folder = specialisation ? folderFor('features', specialisation, rootFolder) : rootFolder;
    const originalName = `${group}${specialisation ? ` / ${specialisation}` : ''}: ${name}`;
    const entry = add('features', name, 'feature', text, system, { _id: id(`features:${originalName}`), folder });
    nameAliases[uuid('features', entry)] = { previous: originalName, current: name };
    return entry;
};
const blocks = (start, end, depth) => {
    const indices = [];
    for (let i = start; i < end; i++) if (new RegExp(`^#{${depth}} `).test(lines[i])) indices.push(i);
    return indices.map((i, n) => ({ name: plain(lines[i].replace(/^#+ /, '')), text: section(i + 1, indices[n + 1] ?? end), line: i + 1 }));
};
const featureAudit = [];
const featureBlocks = (text, source) => {
    const content = clean(text);
    const features = parseFeatureBlocks(content);
    featureAudit.push(auditFeatureBlocks(content, features, source));
    return features;
};

const archetypes = ['Assassin', 'Brawler', 'Commander', 'Fanatic', 'Minstrel', 'Hunter', 'Rogue', 'Scholar', 'Soldier', 'Sorcerer', 'Swashbuckler', 'Warrior'];
for (const [n, name] of archetypes.entries()) {
    const start = heading(name);
    // Swashbuckler's heading is formatted like the other archetypes in the source.
    if (start < 0) throw Error(`Missing archetype ${name}`);
    const end = n < archetypes.length - 1 ? heading(archetypes[n + 1], start + 1) : heading('Heroic Arcana', start + 1);
    const text = section(start + 1, end);
    const specialStart = lines.findIndex((l, i) => i > start && i < end && (/^## .*?(Specialisations|Subclasses)/.test(l) || /<h2[^>]*>.*Specialisations/.test(l)));
    if (specialStart < 0) throw Error(`Missing specialisations: ${name}`);
    const coreText = section(start + 1, specialStart);
    const evasion = Number(coreText.match(/STARTING EVASION:\s*(\d+)/)?.[1]);
    const hp = Number(coreText.match(/STARTING HP:\s*(\d+)/)?.[1]);
    if (!evasion || !hp) throw Error(`Missing statistics: ${name}`);
    const hopeStart = coreText.search(/^#### .*Hope Feature/m);
    const classStart = coreText.search(/^#### Archetype Feature/m);
    const features = [...featureBlocks(coreText.slice(hopeStart, classStart), `${name}: Hope Feature`).map(f => ({ ...f, kind: 'hope' })), ...featureBlocks(coreText.slice(classStart), `${name}: Archetype Features`).map(f => ({ ...f, kind: 'class' }))].map(f => {
        const entry = addFeature(name, f.name, f.text);
        return { type: f.kind, item: uuid('features', entry) };
    });
    const entry = add('archetypes', name, 'class', coreText, { evasion, hitPoints: hp, domains: [], features, subclasses: [], inventory: { take: [], choiceA: [], choiceB: [] } });
    let stop = lines.findIndex((l, i) => i > specialStart && i < end && /^### Background Questions/.test(l));
    if (stop < 0) stop = end;
    for (const spec of blocks(specialStart, stop, 3)) {
        const trait = spec.text.match(/Spellcasting Trait:\s*(Brawn|Charm|Finesse|Instinct|Wits)/i)?.[1].toLowerCase() ?? null;
        const features = featureBlocks(spec.text, `${name} / ${spec.name}`).map(f => {
            const feat = addFeature(name, f.name, f.text, {}, spec.name);
            return { type: 'foundation', item: uuid('features', feat) };
        });
        const specialisation = add('specialisations', spec.name, 'subclass', spec.text, { linkedClass: uuid('archetypes', entry), spellcastingTrait: trait, features }, { _id: id(`specialisations:${spec.name} (${name})`), folder: folderFor('specialisations', name) });
        nameAliases[uuid('specialisations', specialisation)] = { previous: `${spec.name} (${name})`, current: spec.name };
        entry.system.subclasses.push(uuid('specialisations', specialisation));
    }
    const questions = text.match(/### Background Questions([\s\S]*?)### Connections/);
    entry.system.backgroundQuestions = questions ? clean(questions[1]).split('\n').filter(l => /^[-*] /.test(l)).map(l => l.slice(2)) : [];
    entry.system.connections = clean(text.split('### Connections')[1] ?? '').split('\n').filter(l => /^[-*] /.test(l)).map(l => l.slice(2));
}

for (const [pack, title, endTitle, type] of [
    ['origins', 'Origin', 'Communities', 'ancestry'],
    ['communities', 'Communities', 'Core Rules', 'community']
]) {
    const start = heading(title), end = heading(endTitle, start + 1);
    for (const block of blocks(start + 1, end, 4)) {
        const feats = featureBlocks(block.text, `${pack}: ${block.name}`).map((f, n) => {
            const feat = addFeature(block.name, f.name, f.text);
            return type === 'community' ? uuid('features', feat) : { type: n === 0 ? 'primary' : 'secondary', item: uuid('features', feat) };
        });
        add(pack, block.name, type, block.text, { features: feats, loreReference: null });
    }
}

const standard = ['Anchor', 'Flair', 'Lore', 'Poise', 'Shade', 'Steel', 'Tactics', 'Valour'];
const traditions = ['Druidism', 'Dar Matushki', 'Galdr', 'Fire Within', 'Glamour', 'Hexenwerk', 'Porte', 'Sorte', 'Sanderis', 'Art of the Second Prophet'];
const domainConfig = {};
for (const [index, name] of [...standard, ...traditions].entries()) {
    const start = heading(name, heading('Domains'));
    let end = lines.findIndex((l, i) => i > start && /^# /.test(l));
    if (end < 0) end = lines.length;
    const text = section(start + 1, end);
    const trait = text.match(/Spellcasting Trait:\s*(Brawn|Charm|Finesse|Instinct|Wits)/i)?.[1]?.toLowerCase() ?? null;
    domainConfig[key(name)] = { id: key(name), label: name, description: plain(clean(text).split('\n').find(l => /^>/.test(l)) ?? name), src: icon('laurels'), color: ['#4e345b', '#af231c', '#24395d', '#8d3965'][index % 4], tradition: index >= 8, spellcastingTrait: trait };
    const domainEntry = add('domains', name, 'feature', '', {}, { img: icon('laurels') });
    const folder = { _id: id(`folder:talents:${key(name)}`), name, type: 'Item', folder: null, sorting: 'a', sort: index * 100000 };
    if (!folders.has('talents')) folders.set('talents', []);
    folders.get('talents').push(folder);
    const talentLinks = [];
    for (const talent of blocks(start + 1, end, 4)) {
        if (['Rallied', 'Major Unguents', 'Minor Unguents'].includes(talent.name)) continue;
        if (name === 'Sanderis' && talent.name === 'The Contract') {
            const contract = addFeature('Sanderis', 'The Contract', talent.text, { actorResources: ['favor'] });
            const specialisation = packs.get('specialisations').find(entry => entry.name === 'Sanderis');
            specialisation.system.features.push({ type: 'foundation', item: uuid('features', contract) });
            continue;
        }
        if (name === 'Sanderis' && talent.name === 'Break the 7th Circle') continue;
        // Retain IDs derived from the original qualified names when shortening the display names.
        const entry = add('talents', talent.name, 'domainCard', talent.text, { domain: key(name), type: index >= 8 ? 'spell' : 'ability', level: 1, recallCost: 0, inVault: false }, { _id: id(`talents:${talent.name} (${name})`), folder: folder._id });
        nameAliases[uuid('talents', entry)] = { previous: `${talent.name} (${name})`, current: talent.name };
        talentLinks.push(`- @UUID[${uuid('talents', entry)}]{${talent.name}}`);
    }
    domainEntry.system.description = html(`## ${name}\n\n${talentLinks.join('\n')}`);
    domainConfig[key(name)].description = domainEntry.system.description;
}
for (const style of blocks(heading('DUELING STYLES'), heading('Ritual Casting'), 4)) {
    add('dueling-styles', style.name, 'feature', style.text);
}

// Equipment is taken from the manuscript tables, not the upstream SRD.
const rangeKey = text => ({ Melee: 'melee', 'Very Close': 'veryClose', Close: 'close', Far: 'far', 'Very Far': 'veryFar' })[plain(text)];
const damageValue = formula => ({ custom: { enabled: true, formula: formula.replace(/^d/, '1d') } });
const attack = (name, trait, range, damage, modifier = 0, type = 'physical') => ({
    _id: id(`attack:${name}`), name, type: 'attack', systemPath: 'attack', baseAction: true, chatDisplay: false,
    img: attackIcon(name, range, type),
    target: { type: 'any', amount: 1 }, range,
    roll: { type: 'attack', trait, bonus: modifier },
    damage: { main: { type: [type], applyTo: 'hitPoints', value: damageValue(damage) } }
});
const tableRows = (start, end) => lines.slice(start, end).filter(l => l.startsWith('|') && !/^\|\s*:?-/.test(l)).map(l => l.trimEnd().split('|').slice(1, l.trimEnd().endsWith('|') ? -1 : undefined).map(c => c.trim()));
const weapons = tableRows(heading('Melee Weapons'), heading('ARMOUR'));
let secondary = false;
for (const row of weapons) {
    if (row.length !== 6 || !rangeKey(row[2])) continue;
    secondary = ['Shortsword', 'Buckler', 'Round Shield', 'Parrying Dagger', 'Panzerhand'].includes(plain(row[0]));
    const [name, trait, range, damage, grip, feature] = row.map(plain);
    const base = `${damage} + @${trait.toLowerCase()}`;
    add('weapons', name, 'weapon', `**${name}**\n\n${row[5]}${/Blackpowder/.test(feature) ? '\n\n' + section(heading('Ranged Weapons') + 1, heading('Ranged Weapons') + 8) : ''}`, {
        blackpowder: /Blackpowder/.test(feature),
        reloading: /Blackpowder|Reloading/.test(feature),
        ...(/Blackpowder|Reloading/.test(feature) ? { resource: { type: 'simple', value: 1, max: '1', progression: 'decreasing' } } : {}),
        secondary, burden: grip === '2H' ? 'twoHanded' : 'oneHanded', weaponFeatures: [...feature.matchAll(/\b(Powerful|Brutal|Massive)\b/g)].map(match => ({ value: match[1].toLowerCase(), effectIds: [], actionIds: [] })),
        attack: attack(name, trait.toLowerCase(), rangeKey(range), base, /Reliable|Accurate/.test(feature) ? 1 : 0)
    }, { img: icon('battered-axe') });
}
for (const row of tableRows(heading('ARMOUR'), heading('Dracheneisen Items'))) {
    if (row.length !== 4 || !/\d\s*\/\s*\d/.test(row[1])) continue;
    if (/^unarmou?red$/i.test(plain(row[0]))) continue;
    const [major, severe] = plain(row[1]).split('/').map(Number);
    add('armors', plain(row[0]), 'armor', row[3], { armor: { max: Number(row[2]), current: 0 }, baseThresholds: { major, severe }, armorFeatures: [] }, { img: icon('chest-armor') });
}
for (const [pack, title, endTitle, type] of [['loot', 'Artefacts', 'Consumables', 'loot'], ['consumables', 'Consumables', 'Guide to Théah', 'consumable']]) {
    for (const row of tableRows(heading(title), heading(endTitle))) {
        if (row.length !== 2 || !/^\d+$/.test(plain(row[0]))) continue;
        const name = row[1].match(/^\*\*([^*]+)\*\*/)?.[1] ?? row[1].match(/^([^:.]+)[.:]/)?.[1];
        if (!name) throw Error(`Cannot read ${title} row ${row[0]}`);
        add(pack, name.trim(), type, row[1], { quantity: 1 }, { img: 'icons/containers/chest/chest-reinforced-steel-brown.webp' });
    }
}

for (const [pack, first, last, category] of [['adversaries', 'Adversary Statblocks', 'Environments', 'adversary'], ['environments', 'Standard Environments', 'Appendix', 'environment']]) {
    const start = heading(first), end = heading(last, start + 1);
    for (const block of blocks(start + 1, end, 2)) {
        const classification = block.text.match(/^### (Normal|Champion|Standard|Mythic)\s*\|\s*([^\n,]+)/m);
        if (!classification) continue;
        const introduction = block.text.match(/^_([\s\S]*?)_(?=[ \t]*(?:&#x20;)?[ \t]*$)/m)?.[1];
        if (!introduction) throw Error(`Missing introductory description: ${block.name}`);
        const stats = { description: html(`_${introduction.trim().replace(/\s+/g, ' ')}_`), classification: classification[1].toLowerCase(), type: classification[2].trim().toLowerCase(), difficulty: Number(block.text.match(/\*\*Difficulty:\*\*\s*(\d+)/)?.[1] ?? 10), notes: html(block.text) };
        const embedded = featureBlocks(block.text.split('#### Features')[1] ?? '', `${pack}: ${block.name}`).map(f => ({ _id: id(`${pack}:${block.name}:${f.identityName}`), name: f.name, type: 'feature', img: icon('laurels'), system: { description: html(f.text) }, effects: [] }));
        if (category === 'adversary') {
            const th = block.text.match(/\*\*Thresholds:\*\*\s*(\d+)\s*\/\s*(\d+)/);
            stats.damageThresholds = { major: Number(th?.[1] ?? 0), severe: Number(th?.[2] ?? 0) };
            stats.resources = { hitPoints: { value: 0, max: Number(block.text.match(/\*\*HP:\*\*\s*(\d+)/)?.[1] ?? 1) }, stress: { value: 0, max: Number(block.text.match(/\*\*Stress:\*\*\s*(\d+)/)?.[1] ?? 0) } };
            stats.motivesAndTactics = block.text.match(/\*\*Motives & Tactics:\*\*\s*([^\n]+)/)?.[1] ?? '';
            stats.experiences = Object.fromEntries((block.text.match(/\*\*Experiences?:\*\*\s*([^\n]+)/)?.[1] ?? '').split(/[,;]/).map((text, n) => {
                const match = text.trim().match(/^(.*?)\s*\+(\d+)$/);
                return match ? [id(`${block.name}:experience:${n}`), { name: match[1], value: Number(match[2]) }] : null;
            }).filter(Boolean));
            const atk = block.text.match(/\*\*ATK:\*\*\s*([+−-]?\d+)\s*\|\s*([^|]+)\|\s*([^\n]+)/);
            if (atk) {
                const range = Object.keys({ 'Very Close': 0, 'Very Far': 0, Melee: 0, Close: 0, Far: 0 }).find(r => atk[2].includes(r));
                const damage = atk[3].match(/\d*d\d+(?:\s*[+−-]\s*\d+)?/)?.[0] ?? '0';
                stats.attack = attack(plain(atk[2].split(':')[0]), null, rangeKey(range ?? 'Melee'), damage, Number(atk[1].replace('−', '-')), /mag/i.test(atk[3]) ? 'magical' : 'physical');
            }
        } else stats.impulses = block.text.match(/\*\*Impulses:\*\*\s*([^\n]+)/)?.[1] ?? '';
        const name = titleCase(block.name);
        // Preserve existing compendium UUIDs when changing presentation names.
        add(pack, name, category, block.text, stats, { _id: id(`${pack}:${block.name}`), items: embedded, prototypeToken: { name, actorLink: false }, img: category === 'environment' ? 'systems/daggerheart-theah/assets/icons/documents/actors/forest.svg' : 'icons/svg/skull.svg' });
    }
}
// Druidism still has a small, untiered beastform list.
for (const form of blocks(heading('Beastform List'), heading('Dar Matushki', heading('Beastform List')), 2)) {
    const traitMatch = form.text.match(/\*\*(Brawn|Charm|Finesse|Instinct|Wits)\*\*\s*\+(\d+)/);
    const trait = traitMatch?.[1]?.toLowerCase() ?? 'brawn';
    const evasion = Number(form.text.match(/\*\*Evasion\*\*\s*\+(\d+)/)?.[1] ?? 0);
    const atk = form.text.match(/\*\*ATK:\*\*\s*(Melee|Very Close|Close|Far|Very Far)\s*(Brawn|Charm|Finesse|Instinct|Wits)\s*(\d*d\d+(?:\s*\+\s*\d+)?)/);
    const features = featureBlocks(form.text.split('#### Features')[1] ?? '', `beastforms: ${form.name}`).map(f => uuid('features', addFeature(form.name, f.name, f.text)));
    const changes = [
        { type: 'add', key: `system.traits.${trait}.value`, value: Number(traitMatch?.[2] ?? 0), phase: 'initial' },
        { type: 'add', key: 'system.evasion', value: evasion, phase: 'initial' },
        { type: 'standardAttack', phase: 'initial', value: { name: `${form.name} Attack`, damageTypes: ['physical'], attackRange: rangeKey(atk?.[1] ?? 'Melee'), trait, damageFormula: `${(atk?.[3] ?? '1d6').replace(/^d/, '1d')} + @${trait}`, img: 'icons/creatures/claws/claw-straight-brown.webp' } }
    ];
    add('beastforms', form.name, 'beastform', form.text, { description: html(form.text), mainTrait: trait, tokenSize: { size: 'custom', width: 1, height: 1, depth: 1, scale: 1 }, features, examples: form.text.match(/_\(([^)]+)\)_/)?.[1] ?? '', advantageOn: Object.fromEntries((form.text.match(/\*\*Gain Advantage on\*\*:\s*([^\n]+)/)?.[1] ?? '').split(',').filter(Boolean).map((v, n) => [id(`${form.name}:advantage:${n}`), { value: v.trim() }])) }, { effects: [{ _id: id(`formEffect:${form.name}`), name: form.name, type: 'beastform', transfer: true, img: 'icons/creatures/abilities/paw-print-pair-purple.webp', system: { changes, duration: { type: 'shortRest' } } }] });
}

for (const entry of packs.get('features')) {
    if (entry._id === id('features:Castille: Graceful')) passive(entry, [['system.evasion', 1]]);
    if (entry._id === id('features:Vodacce: Sly')) passive(entry, [['system.resources.stress.max', 1]]);
}
for (const entry of packs.get('armors')) {
    if (entry.name === 'Gambeson Armor') passive(entry, [['system.evasion', 1]]);
    if (entry.name === 'Chainmail Armor') passive(entry, [['system.evasion', -1]]);
    if (entry.name === 'Full Plate Armor') passive(entry, [['system.evasion', -2], ['system.traits.finesse.value', -1]]);
}
for (const entry of packs.get('weapons')) {
    if (entry.name === 'Halberd') passive(entry, [['system.traits.finesse.value', -1]]);
    if (['Warhammer', 'Vesten War Axe', 'Greatsword', 'Round Shield', 'Panzerhand'].includes(entry.name)) passive(entry, [['system.evasion', -1], ...(entry.name === 'Panzerhand' ? [['system.traits.finesse.value', -1]] : [])]);
    if (['Buckler', 'Round Shield', 'Panzerhand'].includes(entry.name)) {
        entry.effects.push({ _id: id(`${entry._id}:armour`), name: entry.name, type: 'base', transfer: true, img: entry.img, system: { changes: [{ type: 'armor', phase: 'initial', value: { current: 0, max: entry.name === 'Buckler' ? 1 : 2 } }] } });
    }
}
for (const base of [...packs.get('weapons')]) {
    const name = `Dracheneisen ${base.name}`;
    const entry = add('weapons', name, 'weapon', `${base.system.description}\n\n${section(heading('Dracheneisen Items') + 1, heading('Usual Costs'))}`, structuredClone(base.system), { img: base.img });
    entry.system.description = base.system.description + html(section(heading('Dracheneisen Items') + 1, heading('Usual Costs')));
    entry.system.ironforged = true;
    entry.system.attack._id = id(`attack:${name}`);
    entry.system.attack.damage.main.value.custom.formula += ' + 5';
    entry.system.attack.roll.bonus = /Reliable/.test(base.system.description) ? 2 : Number(base.system.attack.roll.bonus) + 1;
    entry.effects = structuredClone(base.effects).map(e => ({ ...e, _id: id(`${name}:${e._id}`) }));
}
for (const base of [...packs.get('armors')]) {
    const entry = add('armors', `Dracheneisen ${base.name}`, 'armor', section(heading('Dracheneisen Items') + 1, heading('Usual Costs')), structuredClone(base.system), { img: base.img });
    entry.system.description = base.system.description + html(section(heading('Dracheneisen Items') + 1, heading('Usual Costs')));
    entry.system.baseThresholds.major += 3;
    entry.system.baseThresholds.severe += 3;
    entry.system.ironbound = true;
    if (base.name === 'Gambeson Armor') passive(entry, [['system.evasion', 1]]);
    if (base.name === 'Full Plate Armor') passive(entry, [['system.evasion', -1]]);
}

const aptitude = packs.get('features').find(entry => entry.name === 'Sorcerous Aptitude');
const sorcerousAttack = add('weapons', 'Sorcerous Attack', 'weapon', '', {
    description: aptitude.system.description,
    sorcerous: true, burden: 'oneHanded', secondary: false,
    attack: attack('Sorcerous Attack', 'charm', 'far', '1d6 + @spellcastingTrait', 0, 'magical')
});
sorcerousAttack.system.description = aptitude.system.description;

const equipmentConfig = { armor: {}, weapon: {} };
for (const row of [...weapons, ...tableRows(heading('ARMOUR'), heading('Dracheneisen Items'))]) {
    const column = row.length === 6 ? row[5] : row[3];
    if (!column) continue;
    for (const match of column.matchAll(/\*\*([^*]+)\*\*(?::\s*)?([^*]*)/g)) {
        const name = match[1].replace(/[.:]$/, '').trim();
        equipmentConfig[row.length === 6 ? 'weapon' : 'armor'][key(name)] = { label: name, description: html(match[2]), effects: [], actions: [] };
    }
}
equipmentConfig.weapon.blackpowder = { label: 'Blackpowder', description: html(section(heading('Ranged Weapons') + 1, heading('Ranged Weapons') + 8)), effects: [], actions: [] };
await fs.writeFile(path.join(root, 'module/config/manuscript-equipment.json'), JSON.stringify(equipmentConfig, null, 2) + '\n');

const manifestPath = path.join(root, 'system.json');
const counterConfig = {};
for (const pack of ['features', 'talents']) for (const entry of packs.get(pack)) {
    configureCounters(entry, id);
    if (entry.system.resource || entry.system.usageCounters || entry.system.usageNote)
        counterConfig[uuid(pack, entry)] = {
            description: entry.system.description,
            resource: entry.system.resource ?? null,
            usageCounters: entry.system.usageCounters ?? {},
            usageNote: entry.system.usageNote ?? ''
        };
}
for (const pack of ['adversaries', 'environments']) for (const actor of packs.get(pack)) {
    for (const feature of actor.items) {
        configureCounters(feature, id);
        if (feature.system.resource || feature.system.usageNote) counterConfig[`${uuid(pack, actor, 'Actor')}.Item.${feature._id}`] = {
            description: feature.system.description,
            resource: feature.system.resource ?? null,
            usageCounters: feature.system.usageCounters ?? {},
            usageNote: feature.system.usageNote ?? ''
        };
    }
}
await fs.writeFile(path.join(root, 'module/config/manuscript-counters.json'),
    JSON.stringify(counterConfig, null, 2) + '\n');
applyFeatureIcons(packs, domainConfig, folders);
applyEquipmentIcons(packs);
packs.set('adversary-features', buildAdversaryFeatures(packs.get('adversaries'), id));
// Preserve former generated artwork so existing imports can receive icon-only updates.
const artworkPath = path.join(root, 'module/config/manuscript-artwork.json');
const artwork = JSON.parse(await fs.readFile(artworkPath, 'utf8').catch(error => {
    if (error.code === 'ENOENT') return '{}';
    throw error;
}));
const recordArtwork = (entry, original, source) => {
    const previous = new Set(artwork[source]?.previous ?? []);
    if (original?.img && original.img !== entry.img) previous.add(original.img);
    if (previous.size) {
        const previousAttack = new Set(artwork[source]?.previousAttack ?? []);
        if (original?.system.attack?.img) previousAttack.add(original.system.attack.img);
        artwork[source] = { current: entry.img, previous: [...previous], previousAttack: [...previousAttack] };
    }
};
for (const [pack, entries] of packs) for (const entry of entries) {
    const file = path.join(root, 'src/packs', pack, `${entry._id}.json`);
    const original = JSON.parse(await fs.readFile(file, 'utf8').catch(error => {
        if (error.code === 'ENOENT') return 'null';
        throw error;
    }));
    const source = uuid(pack, entry, ['adversaries', 'environments'].includes(pack) ? 'Actor' : 'Item');
    recordArtwork(entry, original, source);
    for (const feature of entry.items ?? []) {
        recordArtwork(feature, original?.items?.find(i => i._id === feature._id), `${source}.Item.${feature._id}`);
    }
}
await fs.writeFile(artworkPath, JSON.stringify(artwork, null, 2) + '\n');
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
manifest.packs = [...packs.keys()].map(name => ({ name, label: ({ armors: 'Armour', loot: 'Artefacts', talents: 'Domain & Sorcerous Talents', 'dueling-styles': 'Dueling Styles', 'adversary-features': 'Adversary Features' })[name] ?? name[0].toUpperCase() + name.slice(1), system: manifest.id, path: `packs/${name}`, type: ['adversaries', 'environments'].includes(name) ? 'Actor' : 'Item', private: false, ownership: { PLAYER: ['adversaries', 'environments'].includes(name) ? 'NONE' : 'OBSERVER', GAMEMASTER: 'OWNER', ASSISTANT: 'OWNER' } }));
manifest.packFolders = [{ name: 'Heart & Dagger', packs: ['adversaries', 'adversary-features', 'environments'], folders: [{ name: 'Character Options', packs: ['archetypes', 'specialisations', 'origins', 'communities', 'domains', 'talents', 'features', 'dueling-styles', 'beastforms'] }, { name: 'Equipment', packs: ['weapons', 'armors', 'loot', 'consumables'] }] }];
await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 4) + '\n');
const sourceRoot = path.join(root, 'src', 'packs');
// Safety: a fixed absolute path under this repository, never a computed external path.
if (!sourceRoot.startsWith(root + path.sep)) throw Error('Source path escaped workspace');
const packLicense = await fs.readFile(path.join(sourceRoot, 'LICENSE'), 'utf8').catch(() => null);
await fs.rm(sourceRoot, { recursive: true, force: true });
await fs.mkdir(sourceRoot, { recursive: true });
if (packLicense) await fs.writeFile(path.join(sourceRoot, 'LICENSE'), packLicense.replace(/^\uFEFF/, ''));
for (const [pack, entries] of packs) {
    await fs.mkdir(path.join(sourceRoot, pack), { recursive: true });
    const collection = ['adversaries', 'environments'].includes(pack) ? 'actors' : 'items';
    const annotateKey = (entry, collection, prefix = '') => {
        const entryID = prefix + entry._id;
        entry._key = `!${collection}!${entryID}`;
        for (const childCollection of ['items', 'effects', 'pages']) for (const child of entry[childCollection] ?? []) annotateKey(child, `${collection}.${childCollection}`, `${entryID}.`);
    };
    for (const entry of entries) {
        annotateKey(entry, collection);
        await fs.writeFile(path.join(sourceRoot, pack, `${entry._id}.json`), JSON.stringify(entry, null, 2) + '\n');
    }
    for (const folder of folders.get(pack) ?? []) {
        folder._key = `!folders!${folder._id}`;
        await fs.writeFile(path.join(sourceRoot, pack, `${folder._id}.json`), JSON.stringify(folder, null, 2) + '\n');
    }
}
await fs.writeFile(path.join(root, 'module/config/manuscript-domains.json'), JSON.stringify(domainConfig, null, 2) + '\n');
await fs.writeFile(path.join(root, 'module/config/manuscript-names.json'), JSON.stringify(nameAliases, null, 2) + '\n');
await fs.writeFile(path.join(root, 'src/manuscript-index.json'), JSON.stringify({ sourceHash: createHash('sha256').update(manuscript).digest('hex'), packs: Object.fromEntries([...packs].map(([name, entries]) => [name, entries.length])), folders: Object.fromEntries([...folders].map(([name, entries]) => [name, entries.length])) }, null, 2) + '\n');
console.log(Object.fromEntries([...packs].map(([name, entries]) => [name, entries.length])));
await fs.writeFile(path.join(root, 'src/feature-audit-report.json'), JSON.stringify({
    sourceHash: createHash('sha256').update(manuscript).digest('hex'),
    contexts: featureAudit.length,
    features: featureAudit.reduce((count, context) => count + context.features.length, 0),
    directSourceFeatures: ['The Contract', ...packs.get('dueling-styles').map(f => f.name), ...packs.get('domains').map(f => f.name)],
    derivedFeatureDocuments: packs.get('adversary-features').length,
    totalFeatureDocuments: [...packs.values()].flat().reduce((count, entry) =>
        count + Number(entry.type === 'feature') + (entry.items ?? []).filter(i => i.type === 'feature').length, 0),
    verified: featureAudit
}, null, 2) + '\n');
