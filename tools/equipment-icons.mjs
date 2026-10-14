// Stock coloured equipment art; Dracheneisen variants share their base icon.
export const EQUIPMENT_ICONS = {
    'Sorcerous Attack': 'icons/weapons/staves/staff-ornate-jeweled-blue.webp',
    'Vesten War Axe': 'icons/weapons/axes/axe-double-engraved-runes.webp',
    Mace: 'icons/weapons/maces/mace-flanged-steel.webp',
    Rapier: 'icons/weapons/swords/sword-guard-brass-worn.webp',
    Axe: 'icons/weapons/axes/axe-battle-simple.webp',
    'Throwing Axe': 'icons/weapons/axes/axe-tomahawk-engraved.webp',
    Warstaff: 'icons/weapons/staves/staff-simple-wrapped.webp',
    Buckler: 'icons/equipment/shield/buckler-iron-cross-gray.webp',
    'Parrying Dagger': 'icons/weapons/daggers/dagger-curved-guard-blue.webp',
    Broadsword: 'icons/weapons/swords/shortsword-broad-engraved.webp',
    'Round Shield': 'icons/equipment/shield/round-wooden-boss-steel-brown.webp',
    Shortbow: 'icons/weapons/bows/shortbow-recurve-leather.webp',
    Longbow: 'icons/weapons/bows/longbow-recurve-leather-brown.webp',
    Spear: 'icons/weapons/polearms/spear-flared-wrapped.webp',
    Halberd: 'icons/weapons/polearms/halberd-crescent-engraved-steel.webp',
    Musket: 'icons/weapons/guns/gun-wood.webp',
    Backsword: 'icons/weapons/swords/sword-guard-brown.webp',
    Greatsword: 'icons/weapons/swords/greatsword-crossguard-steel.webp',
    Dagger: 'icons/weapons/daggers/dagger-simple-blue.webp',
    Pistol: 'icons/weapons/guns/gun-pistol-flintlock.webp',
    Gauntlets: 'icons/equipment/hand/gauntlet-armored-leather-steel-blue.webp',
    Blunderbuss: 'icons/weapons/guns/gun-blunderbuss-bronze.webp',
    Whip: 'icons/weapons/misc/whip-leather.webp',
    Warhammer: 'icons/weapons/hammers/hammer-war-spiked.webp',
    Shortsword: 'icons/weapons/swords/shortsword-guard-silver.webp',
    Panzerhand: 'icons/equipment/hand/gauntlet-armored-heavy-steel.webp',
    Longsword: 'icons/weapons/swords/sword-guard-engraved.webp',
    Crossbow: 'icons/weapons/crossbows/crossbow-long-brown.webp',
    'Leather Armor': 'icons/equipment/chest/breastplate-layered-leather-brown.webp',
    'Gambeson Armor': 'icons/equipment/chest/breastplate-quilted-brown.webp',
    'Chainmail Armor': 'icons/equipment/chest/breastplate-metal-scaled-grey.webp',
    'Full Plate Armor': 'icons/equipment/chest/breastplate-cuirass-steel-grey.webp'
};

export function applyEquipmentIcons(packs) {
    for (const pack of ['weapons', 'armors']) for (const entry of packs.get(pack)) {
        const name = entry.name.replace(/^Dracheneisen /, '');
        const icon = EQUIPMENT_ICONS[name];
        if (!icon) throw Error(`Missing equipment icon: ${entry.name}`);
        entry.img = icon;
        if (entry.system.attack) entry.system.attack.img = icon;
        for (const effect of entry.effects) effect.img = icon;
    }
}
