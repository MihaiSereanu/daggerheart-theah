import assert from 'node:assert/strict';
import test from 'node:test';
import {
    STARTING_LOADOUTS,
    resolveStartingEquipment,
    startingEquipmentChoices,
    startingEquipmentSources
} from '../module/heart-dagger/starting-equipment.mjs';

const item = (name, type, system) => ({
    name,
    type,
    system,
    uuid: `Compendium.test.${name}`,
    toObject: () => ({ _id: name, name, type, system: structuredClone(system) })
});

const greatsword = item('Greatsword', 'weapon', { burden: 'twoHanded', secondary: false });
const rapier = item('Rapier', 'weapon', { burden: 'oneHanded', secondary: false });
const dagger = item('Dagger', 'weapon', { burden: 'oneHanded', secondary: false });
const buckler = item('Buckler', 'weapon', { burden: 'oneHanded', secondary: true });
const sorcery = item('Sorcerous Attack', 'weapon', { burden: 'oneHanded', secondary: false, sorcerous: true });
const relic = item('Dracheneisen Axe', 'weapon', { burden: 'oneHanded', secondary: false, ironforged: true });
const leather = item('Leather Armor', 'armor', { armor: { max: 3 } });
const ironbound = item('Dracheneisen Armor', 'armor', { armor: { max: 4 }, ironbound: true });
const choices = startingEquipmentChoices(
    [greatsword, rapier, dagger, buckler, sorcery, relic],
    [leather, ironbound]
);

test('starting choices separate weapon roles and omit special equipment', () => {
    assert.deepEqual(choices.twoHanded, [greatsword]);
    assert.deepEqual(choices.primary, [rapier, dagger]);
    assert.deepEqual(choices.secondary, [buckler]);
    assert.deepEqual(choices.armours, [leather]);
    assert.equal(choices.baselineDagger, dagger);
});

test('two-handed loadout accepts optional armour and equips both items', () => {
    const selection = resolveStartingEquipment({
        weaponLoadout: STARTING_LOADOUTS.TWO_HANDED,
        twoHandedWeapon: greatsword.uuid,
        armour: leather.uuid
    }, choices);
    assert.equal(selection.error, undefined);
    const sources = startingEquipmentSources(selection, choices.baselineDagger);
    assert.deepEqual(sources.map(source => [source.name, source.system.equipped, source.system.secondary]), [
        ['Leather Armor', true, undefined],
        ['Greatsword', true, false],
        ['Dagger', false, false]
    ]);
    assert.equal(sources[0]._stats.compendiumSource, leather.uuid);
    assert.equal('_id' in sources[0], false);
});

test('paired loadout requires the correct primary and secondary weapon roles', () => {
    const selection = resolveStartingEquipment({
        weaponLoadout: STARTING_LOADOUTS.PRIMARY_AND_SECONDARY,
        primaryWeapon: rapier.uuid,
        secondaryWeapon: buckler.uuid,
        armour: ''
    }, choices);
    assert.equal(selection.armour, null);
    const sources = startingEquipmentSources(selection, choices.baselineDagger)
        .map(source => [source.name, source.system.equipped, source.system.secondary]);
    assert.deepEqual(sources, [
        ['Rapier', true, false],
        ['Buckler', true, true],
        ['Dagger', false, false]
    ]);

    assert.match(resolveStartingEquipment({
        weaponLoadout: STARTING_LOADOUTS.PRIMARY_AND_SECONDARY,
        primaryWeapon: buckler.uuid,
        secondaryWeapon: rapier.uuid,
        armour: ''
    }, choices).error, /one-handed primary/);
});
