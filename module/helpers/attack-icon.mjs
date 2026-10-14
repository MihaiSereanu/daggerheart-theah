/** Choose a coloured Foundry icon for a standard attack. */
export function attackIcon(name = '', range = 'melee', damageType = 'physical') {
    if (/cannon|magitech/i.test(name)) return 'icons/weapons/guns/gun-blunderbuss-bronze.webp';
    if (/bow|arrow/i.test(name)) return 'icons/weapons/bows/longbow-recurve-leather-brown.webp';
    if (/gun|pistol|musket|blunderbuss/i.test(name)) return 'icons/weapons/guns/gun-blunderbuss-gold.webp';
    if (/claw|arms|beak/i.test(name)) return 'icons/creatures/claws/claw-talons-yellow-red.webp';
    if (/bite|maw|fang/i.test(name)) return 'icons/creatures/abilities/bear-roar-bite-brown-green.webp';
    if (/slam|fist|punch/i.test(name)) return 'icons/skills/melee/unarmed-punch-fist-yellow-red.webp';
    if (/magic|spell/i.test(name) || damageType === 'magical') return 'icons/magic/symbols/runes-star-magenta.webp';
    if (/dagger|knife/i.test(name)) return 'icons/weapons/daggers/dagger-simple-blue.webp';
    if (/axe/i.test(name)) return 'icons/skills/melee/strike-axe-blood-red.webp';
    if (range !== 'melee') return 'icons/skills/ranged/target-bullseye-arrow-green.webp';
    return 'icons/skills/melee/hand-grip-sword-orange.webp';
}
