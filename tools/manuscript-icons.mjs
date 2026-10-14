// Paths refer to Foundry's bundled, full-colour WebP collection.
// Keep group choices explicit so a manuscript rebuild preserves the artwork.
export const GROUP_ICONS = {
    Assassin: 'icons/weapons/daggers/dagger-poisoned-curved-green.webp',
    Brawler: 'icons/skills/melee/unarmed-punch-fist-yellow-red.webp',
    Commander: 'icons/sundries/flags/banner-standard-blue.webp',
    Fanatic: 'icons/sundries/books/book-red-cross.webp',
    Minstrel: 'icons/tools/instruments/lute-gold-brown.webp',
    Hunter: 'icons/skills/ranged/target-bullseye-arrow-green.webp',
    Rogue: 'icons/equipment/back/cloak-hooded-green-gold.webp',
    Scholar: 'icons/sundries/books/book-open-turquoise.webp',
    Soldier: 'icons/skills/melee/shield-block-bash-blue.webp',
    Sorcerer: 'icons/magic/symbols/runes-star-magenta.webp',
    Swashbuckler: 'icons/skills/melee/sword-twirl-orange.webp',
    Warrior: 'icons/skills/melee/weapons-crossed-swords-yellow-teal.webp',

    Avalon: 'icons/creatures/abilities/lion-roar-yellow.webp',
    Castille: 'icons/sundries/flags/banner-symbol-sun-gold-red.webp',
    Eisen: 'icons/equipment/shield/heater-steel-boss-red.webp',
    'Highland Marches': 'icons/sundries/flags/banner-flag-white-mountain.webp',
    Inismore: 'icons/magic/symbols/clover-luck-white-green.webp',
    Montaigne: 'icons/magic/symbols/fleur-de-lis-yellow.webp',
    Sarmatia: 'icons/environment/creatures/horse-white.webp',
    Ussura: 'icons/creatures/abilities/bear-roar-bite-brown-green.webp',
    Vesten: 'icons/sundries/flags/banner-symbol-axe-red.webp',
    Vodacce: 'icons/magic/symbols/mask-yellow-orange.webp',

    Academic: 'icons/sundries/books/book-embossed-blue.webp',
    Coastal: 'icons/environment/settlement/lighthouse-rock-blue.webp',
    Criminal: 'icons/skills/social/theft-pickpocket-bribery-brown.webp',
    Highlands: 'icons/environment/wilderness/cave-entrance-mountain-blue.webp',
    Nobility: 'icons/magic/control/control-influence-crown-gold.webp',
    Order: 'icons/sundries/flags/banner-standard-purple.webp',
    'Rural North': 'icons/environment/wilderness/tree-spruce-green.webp',
    Traveler: 'icons/tools/navigation/compass-brass-blue-red.webp',
    Village: 'icons/environment/settlement/house-farmland-small.webp',
    Wildborne: 'icons/environment/wilderness/tree-oak.webp',

    Anchor: 'icons/sundries/flags/banner-sword-blue.webp',
    Flair: 'icons/skills/melee/strike-blade-scimitar-orange-blue.webp',
    Lore: 'icons/sundries/books/book-embossed-jewel-gold-green.webp',
    Poise: 'icons/skills/social/diplomacy-handshake-yellow.webp',
    Shade: 'icons/magic/perception/shadow-stealth-eyes-purple.webp',
    Steel: 'icons/skills/melee/weapons-crossed-swords-teal.webp',
    Tactics: 'icons/skills/melee/swords-parry-block-yellow.webp',
    Valour: 'icons/equipment/shield/heater-steel-gold.webp',
    Druidism: 'icons/sundries/books/book-symbol-leaf-gold-green.webp',
    'Dar Matushki': 'icons/creatures/abilities/bear-roar-bite-brown-green.webp',
    Galdr: 'icons/magic/symbols/runes-carved-stone-purple.webp',
    'Fire Within': 'icons/magic/fire/explosion-fireball-medium-orange.webp',
    Glamour: 'icons/magic/control/buff-luck-fortune-rainbow.webp',
    Hexenwerk: 'icons/consumables/potions/round-decorated-snake-green.webp',
    Porte: 'icons/skills/wounds/blood-cells-vessel-red-orange.webp',
    Sorte: 'icons/commodities/cloth/thread-and-needle.webp',
    Sanderis: 'icons/magic/control/fear-fright-monster-grin-red-orange.webp',
    'Art of the Second Prophet': 'icons/sundries/books/book-symbol-canterbury-cross.webp',

    'Agile Scout': 'icons/creatures/abilities/paw-print-orange.webp',
    'Household Friend': 'icons/creatures/abilities/paw-print-tan.webp',
    'Pack Predator': 'icons/creatures/abilities/wolf-howl-moon-purple.webp',
    'Pouncing Predator': 'icons/creatures/claws/claw-talons-yellow-red.webp',
    'Mighty Strider': 'icons/environment/creatures/horse-brown.webp',
    'Powerful Beast': 'icons/creatures/abilities/bear-roar-bite-brown-green.webp',

    Aldana: 'icons/skills/melee/sword-twirl-orange.webp',
    Ambrogia: 'icons/weapons/daggers/dagger-poisoned-curved-green.webp',
    Boucher: 'icons/skills/melee/maneuver-daggers-paired-orange.webp',
    Donovan: 'icons/skills/melee/shield-block-bash-blue.webp',
    Drexel: 'icons/skills/melee/maneuver-greatsword-yellow.webp',
    Eisenfaust: 'icons/equipment/hand/gauntlet-clawed-steel-blue.webp',
    Leegstra: 'icons/skills/melee/strike-axe-blood-red.webp',
    Mantovani: 'icons/skills/melee/strike-chain-whip-blue.webp',
    Mireli: 'icons/skills/melee/strike-blade-scimitar-orange-blue.webp',
    Sabat: 'icons/environment/people/cavalry.webp',
    Torres: 'icons/skills/melee/swords-parry-block-blue.webp',
    Valroux: 'icons/skills/melee/strike-sword-dagger-runes-gold.webp'
};

// Adversary and environment features have no character option group.
// Match the feature's name first; its description supplies context otherwise.
const FEATURE_THEMES = [
    [/fire|flam|hellfire|detonation|eruption|sunsear|cannon|blunderbuss/i, 'icons/magic/fire/explosion-fireball-medium-orange.webp'],
    [/\b(?:ice|icy|frost|snow|avalanche)\b/i, 'icons/magic/water/snowflake-ice-blue.webp'],
    [/venom|poison|fumigation/i, 'icons/weapons/daggers/dagger-poisoned-curved-green.webp'],
    [/teleport|exile|walkway|portal/i, GROUP_ICONS.Porte],
    [/fear|terrify|horrify|despair|no hope|torment|scream/i, 'icons/magic/control/fear-fright-monster-purple-blue.webp'],
    [/shadow|unseen|blend in|ghost|mistform|shroud|infiltrat|secrets?|ambush|backstab|subtle|stalker|stealth/i, GROUP_ICONS.Shade],
    [/shield|armor|armour|hold fast|devotion|loyalty|reinforce|unrelent|unending|relentless/i, GROUP_ICONS.Valour],
    [/regenerat|refresh|won.t stay dead|heal/i, 'icons/magic/life/heart-cross-strong-green.webp'],
    [/gaze|eyes|glance|petrif|gathering|precision|mark target|pick.*target|hunt/i, 'icons/creatures/eyes/humanoid-single-purple-blue.webp'],
    [/bite|fang|blood in the water/i, 'icons/creatures/abilities/bear-roar-bite-brown-green.webp'],
    [/trample|charge|charging|momentum|gore/i, GROUP_ICONS['Mighty Strider']],
    [/climb|claw|rend|limb|many.head|flail/i, GROUP_ICONS['Pouncing Predator']],
    [/fly|wings|dive|from above|wind|eagle/i, 'icons/magic/control/buff-flight-wings-blue.webp'],
    [/tactics|orders?|signal|rally|reinforcements|horde|minion|followers|group attack|strike as one|guards|master.*will|we are all|realm|muscle money|too many|overwhelm/i, GROUP_ICONS.Anchor],
    [/decree|nobil|mockery|retort|rival|bargain|deal|ears|crowd|scapegoat|friends|lips|rumors|yours|fervor/i, GROUP_ICONS.Poise],
    [/chain|shackle|cage|hold.*down|detain|got.*em|box in|dragged/i, 'icons/magic/control/debuff-chains-shackles-movement-purple.webp'],
    [/arcane|mana|magic|ritual|summon|curse|hex|chaotic|flux|overcharge|overload|residual|fae|sidhe|unnatural|omens/i, GROUP_ICONS.Sorcerer],
    [/death|grave|zombies|bones|souls|reaper|blasphem|fallen/i, 'icons/sundries/books/book-symbol-skull-grey.webp'],
    [/shot|firing|fire|pick off|artillery/i, GROUP_ICONS.Hunter],
    [/strike|blade|riposte|cut|execute|grace|battle|retaliat|frenzy|fury|force|break|slam|bash|lunge|quarter|sword|swashbuckler/i, GROUP_ICONS.Steel],
    [/water|undertow|adrift|sea|decks/i, 'icons/environment/settlement/ship.webp'],
    [/road|path|crossing|escape|exfiltrat|streets|runaround|climb|fall|piton/i, GROUP_ICONS.Traveler],
    [/vault|find|treasure|sticky fingers|quick hands/i, 'icons/containers/chest/chest-reinforced-steel-brown.webp'],
    [/hall|architecture|barracks|office|structure|siege/i, 'icons/environment/settlement/castle.webp'],
    [/alarm|begin|surprise|wrong place|signs of trouble|saw this|prep work/i, GROUP_ICONS.Tactics],
    [/tree|branches|land/i, GROUP_ICONS.Wildborne]
];

export function featureIcon(name, description, fallback) {
    for (const text of [name, description]) {
        const theme = FEATURE_THEMES.find(([pattern]) => pattern.test(text));
        if (theme) return theme[1];
    }
    return fallback;
}

export function applyFeatureIcons(packs, domains, folders) {
    const grouped = new Set(['archetypes', 'origins', 'communities', 'domains', 'dueling-styles', 'beastforms']);
    for (const [pack, entries] of packs) for (const entry of entries) {
        let group;
        if (grouped.has(pack)) group = entry.name;
        if (pack === 'specialisations') group = packs.get('archetypes').find(a => entry.system.linkedClass.endsWith(a._id))?.name;
        if (pack === 'specialisations' && ['Porte', 'Sanderis'].includes(entry.name)) group = entry.name;
        if (pack === 'talents') group = domains[entry.system.domain]?.label;
        if (pack === 'features') {
            const folder = folders.get('features').find(f => f._id === entry.folder);
            group = (folder.folder ? folders.get('features').find(f => f._id === folder.folder) : folder).name;
            if (['Porte', 'Sanderis'].includes(folder.name)) group = folder.name;
        }
        if (group) {
            const image = GROUP_ICONS[group];
            if (!image) throw Error(`Missing coloured icon for ${pack}: ${group}`);
            entry.img = image;
            for (const effect of entry.effects ?? []) effect.img = image;
        }
        if (['adversaries', 'environments'].includes(pack)) {
            const fallback = pack === 'environments' ? GROUP_ICONS.Traveler : GROUP_ICONS.Steel;
            for (const feature of entry.items ?? []) {
                feature.img = featureIcon(feature.name, feature.system.description, fallback);
            }
        }
    }
    for (const domain of Object.values(domains)) domain.src = GROUP_ICONS[domain.label];
}
