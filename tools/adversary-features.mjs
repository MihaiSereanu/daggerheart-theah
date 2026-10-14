import { createHash } from 'node:crypto';

// Adversary stat blocks often shorten their own name in feature text. Keep these
// aliases explicit so extraction changes only self-references, not named allies.
const SELF_ALIASES = {
    'Assassin Poisoner': ['Assassin'],
    'Bandit Archer': ['Sniper'],
    'Bandit Hexer': ['Hexer'],
    'Bandit Kneebreaker': ['Kneebreaker'],
    'Bandit Lackey': ['Bandit Lackeys', 'Lackey'],
    'Bandit Lieutenant': ['Lieutenant'],
    'Bandit Shadow': ['Shadow'],
    'Bladed Guard': ['Bladed Guards', 'Guard'],
    'Cult Adept': ['Adept'],
    'Cultist Leader': ['Leader'],
    'Demon of Despair': ['Demon'],
    'Demon of Jealousy': ['Demon'],
    'Demon of Wrath': ['Demon'],
    'Dire Wolf': ['Wolf'],
    'Elite Soldier': ['Soldier'],
    'Giant Eagle': ['Eagle'],
    'Head Guard': ['Head Guard'],
    'Marksman Duelist': ['Duelist'],
    'Master Assassin': ['Assassins', 'Assassin'],
    'Master Thief': ['Thief'],
    'Merchant Baron': ['Merchant'],
    'Musclebound Brute': ['Brute'],
    'Patchwork Zombie Hulk': ['Zombie'],
    'Pirate Captain': ['Captain'],
    'Pirate Raiders': ['Raiders'],
    'Rotted Zombie': ['Rotted Zombies', 'Zombie'],
    'Shambling Zombie': ['Zombie'],
    'Sidhe Queen': ['Queen'],
    'Sidhe Soldier': ['Soldier'],
    'Skeletal Knight': ['Knight'],
    'Skeleton Archer': ['Archer'],
    'Skeleton Warrior': ['Warrior'],
    'Spectral Archer': ['Archer'],
    'Spectral Captain': ['Captain'],
    'Spectral Warrior': ['Guardian'],
    'Syrneth Construct': ['Construct'],
    'Syrneth Guardian Turret': ['Turret'],
    'Syrneth Puzzlebox': ['Box', 'cube'],
    'Syrneth Vault Sentinel': ['Sentinel'],
    Sellsword: ['Sellswords'],
    'The Minotaur': ['Minotaur'],
    'Tough Pirate': ['Tough'],
    'Vampire Count': ['Vampire'],
    'Veteran Knight': ['Knight'],
    'Walkway Demon': ['Demon'],
    'Wolf Pack': ['Wolf Pack', 'Wolves'],
    'Zombie Pack': ['Zombies']
};

const PLURAL_ALIASES = new Set(['Assassins', 'Bandit Lackeys', 'Bladed Guards', 'Pirate Raiders', 'Raiders', 'Rotted Zombies', 'Sellswords', 'Wolves', 'Zombies']);
const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sentenceCase = (match, replacement) => /^[A-Z]/.test(match) ? replacement[0].toUpperCase() + replacement.slice(1) : replacement;
const cleanDescription = description => description
    .replace(/\s*<hr>[\s\S]*$/i, '')
    .replace(/[ \t]+(?=<\/p>)/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .trim() + '\n';

function replaceAlias(description, alias) {
    const escaped = escapeRegExp(alias.replace(/^The\s+/i, ''));
    const plural = PLURAL_ALIASES.has(alias);

    description = description.replace(new RegExp(`\\b(all|additional|another|other)\\s+${escaped}\\b(?!\\s+minions?\\b)`, 'gi'), (match, determiner) => {
        const noun = /all/i.test(determiner) ? 'adversaries' : 'adversary';
        return `${determiner} ${noun} with this feature`;
    });
    if (!plural) {
        description = description.replace(new RegExp(`\\b(an?|another)\\s+${escaped}\\b(?!\\s+minions?\\b)`, 'gi'), (match, determiner) =>
            `${/another/i.test(determiner) ? 'another' : 'an'} adversary with this feature`);
    }
    description = description.replace(new RegExp(`\\b(?:[Tt]he\\s+)?${escaped}(?:â€™s|'s|&#39;s|&apos;s)`, 'g'), match =>
        sentenceCase(match, 'the adversary\'s'));
    description = description.replace(new RegExp(`\\b(?:[Tt]he\\s+)?${escaped}\\b(?!\\s+minions?\\b)`, 'g'), match =>
        sentenceCase(match, 'the adversary'));
    return description;
}

export function genericizeAdversaryFeature(description, adversaryName) {
    const aliases = [...new Set([adversaryName, ...(SELF_ALIASES[adversaryName] ?? [])])]
        .sort((a, b) => b.length - a.length);
    let generic = description;
    for (const alias of aliases) generic = replaceAlias(generic, alias);

    // Repair agreement after plural stat-block names become the singular generic subject.
    generic = generic
        .replace(/\bthe adversary have\b/g, 'the adversary has')
        .replace(/\bthe adversary mark\b/g, 'the adversary marks')
        .replace(/\bthe adversary move\b/g, 'the adversary moves')
        .replace(/\bhits a PC with an attack\b/g, 'makes a successful attack against a PC')
        .replace(/\bgain 1 Fear\b/g, 'gain a Fear')
        .replace(/\bSpend 1 Fear to pick a target\b/g, 'Spend 1 Fear to choose a target')
        .replace(/\bThose Minions\b/g, 'Those adversaries');
    return cleanDescription(generic);
}

export function parseAdversaryFeatureName(name) {
    const suffix = name.match(/^(.*?)\s+[-–—]\s*(passive|action|reaction)\s*$/i);
    if (suffix) return { name: suffix[1].trim(), featureForm: suffix[2].toLowerCase() };

    // Correct the source's misplaced closing parenthesis in "Minion (4 - Passive)".
    const parentheticalSuffix = name.match(/^(.*?)\s*[-–—]\s*(passive|action|reaction)\s*\)$/i);
    if (parentheticalSuffix) return {
        name: `${parentheticalSuffix[1].trim()})`,
        featureForm: parentheticalSuffix[2].toLowerCase()
    };
    return { name: name.trim(), featureForm: 'passive' };
}

export function buildAdversaryFeatures(adversaries, id = text => createHash('sha256').update(text).digest('hex').slice(0, 16)) {
    const unique = new Map();
    for (const adversary of adversaries) for (const source of adversary.items ?? []) {
        if (source.type !== 'feature') continue;
        const parsed = parseAdversaryFeatureName(source.name);
        const system = structuredClone(source.system ?? {});
        system.description = genericizeAdversaryFeature(system.description ?? '', adversary.name);
        system.attribution = { source: 'Heart & Dagger Manuscript' };
        system.featureForm = parsed.featureForm;
        const identity = JSON.stringify({ name: parsed.name, system, effects: source.effects ?? [] });
        if (unique.has(identity)) continue;
        const feature = {
            _id: id(`adversary-features:${identity}`),
            name: parsed.name,
            type: 'feature',
            img: source.img,
            system,
            effects: structuredClone(source.effects ?? [])
        };
        unique.set(identity, feature);
    }
    return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name) || a._id.localeCompare(b._id));
}

