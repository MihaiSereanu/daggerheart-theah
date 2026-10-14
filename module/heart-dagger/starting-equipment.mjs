export const STARTING_LOADOUTS = Object.freeze({
    TWO_HANDED: 'twoHanded',
    PRIMARY_AND_SECONDARY: 'primaryAndSecondary'
});

/** Return the ordinary equipment available during character creation. */
export function startingEquipmentChoices(weapons, armours) {
    const ordinaryWeapons = weapons.filter(item => !item.system.ironforged && !item.system.sorcerous);
    return {
        twoHanded: ordinaryWeapons.filter(item => !item.system.secondary && item.system.burden === 'twoHanded'),
        primary: ordinaryWeapons.filter(item => !item.system.secondary && item.system.burden === 'oneHanded'),
        secondary: ordinaryWeapons.filter(item => item.system.secondary && item.system.burden === 'oneHanded'),
        armours: armours.filter(item => !item.system.ironbound),
        baselineDagger: ordinaryWeapons.find(item => item.name === 'Dagger') ?? null
    };
}

/** Validate submitted UUIDs against their permitted equipment lists. */
export function resolveStartingEquipment(result, choices) {
    const armour = result.armour
        ? choices.armours.find(item => item.uuid === result.armour)
        : null;
    if (result.armour && !armour) return { error: 'Choose a valid armour.' };

    if (result.weaponLoadout === STARTING_LOADOUTS.TWO_HANDED) {
        const primary = choices.twoHanded.find(item => item.uuid === result.twoHandedWeapon);
        if (!primary) return { error: 'Choose a two-handed primary weapon.' };
        return { armour, weapons: [{ item: primary, secondary: false }] };
    }

    if (result.weaponLoadout === STARTING_LOADOUTS.PRIMARY_AND_SECONDARY) {
        const primary = choices.primary.find(item => item.uuid === result.primaryWeapon);
        const secondary = choices.secondary.find(item => item.uuid === result.secondaryWeapon);
        if (!primary || !secondary) {
            return { error: 'Choose a one-handed primary weapon and a one-handed secondary weapon.' };
        }
        return {
            armour,
            weapons: [
                { item: primary, secondary: false },
                { item: secondary, secondary: true }
            ]
        };
    }

    return { error: 'Choose a valid weapon loadout.' };
}

/** Convert the validated selection into equipped embedded-item sources. */
export function startingEquipmentSources(selection, baselineDagger) {
    const selected = [
        ...(selection.armour ? [{ item: selection.armour, secondary: false }] : []),
        ...selection.weapons,
        { item: baselineDagger, secondary: false, equipped: false }
    ];
    return selected.map(({ item, secondary, equipped = true }) => {
        const source = item.toObject();
        delete source._id;
        source._stats = { compendiumSource: item.uuid };
        source.system.equipped = equipped;
        if (source.type === 'weapon') source.system.secondary = secondary;
        return source;
    });
}
