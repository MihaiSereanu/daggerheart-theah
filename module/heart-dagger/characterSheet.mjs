import CharacterSheet from '../applications/sheets/actors/character-sheet.mjs';
import { XP_THRESHOLDS, TRAITS, levelForXP, advancementPhaseForLevel, rewardForLevel, advancementAvailable, talentAccess } from './rules.mjs';
import { prompt, selectHTML, inputHTML, escapeHTML, supply, rest, rite, pay, refreshCounters } from './dialogs.mjs';
import { soloStunt } from './stunts.mjs';
import { documentSelect, selectionPrompt } from './selection-dialog.mjs';
import { ensureSorcerousAttack } from './sorcerous-attack.mjs';
import {
    STARTING_LOADOUTS,
    resolveStartingEquipment,
    startingEquipmentChoices,
    startingEquipmentSources
} from './starting-equipment.mjs';

const documents = async pack => (await game.packs.get(`${CONFIG.DH.id}.${pack}`).getDocuments())
    .sort((a, b) => a.name.localeCompare(b.name));
const sources = entries => entries.map(e => {
    const data = e.toObject();
    delete data._id;
    data._stats = { compendiumSource: e.uuid };
    return data;
});
const traitOptions = Object.fromEntries(TRAITS.map(key => [key, key[0].toUpperCase() + key.slice(1)]));

export default class HeartDaggerCharacterSheet extends CharacterSheet {
    static DEFAULT_OPTIONS = {
        actions: {
            levelManagement: async function () {
                return this.actor.system.needsCharacterSetup ? this.setupCharacter() : this.advanceCharacter();
            },
            viewLevelups: async function () { await prompt('Advancement Record', `<pre>${escapeHTML(JSON.stringify(this.actor.system.advancementHistory, null, 2))}</pre>`, 'Close'); },
            resetCharacter: async function () { return this.configureCharacter(); },
            configureCharacter: async function () { return this.configureCharacter(); },
            heartSupply: async function () { return supply(this.actor); },
            heartRite: async function () { return rite(this.actor); },
            heartStunt: async function () { return soloStunt(this.actor); },
            useDowntime: async function (_, button) { return rest(this.actor, button.dataset.type === 'longRest'); },
            learnTalent: async function () { return this.learnTalent(); },
            newSession: async function () {
                await refreshCounters(this.actor, ['session', 'scene']);
                await this.actor.update({ 'system.stuntUsed': false });
            },
            toggleItemReload: async function (_, button) {
                const item = this.actor.items.get(button.closest('[data-item-id]').dataset.itemId);
                if (item?.system.needsReload && await pay(this.actor, 'stress', 1)) await item.update({ 'system.reloadRequired': false, 'system.resource.value': 1 });
            },
            openPack: async function (_, button) {
                const key = { classes: 'archetypes', subclasses: 'specialisations', ancestries: 'origins', domains: 'talents' }[button.dataset.key] ?? button.dataset.key;
                game.packs.get(`${CONFIG.DH.id}.${key}`)?.render(true);
            }
        },
        window: { controls: [{ action: 'configureCharacter', label: 'Character Options', icon: 'fa-solid fa-pen' }, { action: 'viewLevelups', label: 'Advancement Record', icon: 'fa-solid fa-angles-up' }] }
    };

    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.heartCanAdvance = this.actor.system.levelData.level.current < levelForXP(this.actor.system.xp);
        context.heartNextXP = XP_THRESHOLDS[this.actor.system.levelData.level.current] ?? 'Maximum level';
        context.heartSupply = this.actor.system.supply ? `d${this.actor.system.supply}` : 'Exhausted';
        return context;
    }

    _attachPartListeners(partId, element, options) {
        super._attachPartListeners(partId, element, options);
        element.querySelectorAll('.feature-usage-counter').forEach(input => input.addEventListener('change', async () => {
            if (!this.isEditable) return;
            const item = this.actor.items.get(input.closest('[data-item-id]').dataset.itemId);
            const max = Number(input.max);
            const value = Math.clamp(Number(input.value) || 0, 0, max);
            await item.update({ [`system.usageCounters.${input.dataset.counter}.value`]: value });
        }));
    }

    async _onDropItem(event, item) {
        if (this.actor.uuid === item.parent?.uuid) return super._onDropItem(event, item);
        if (['ancestry', 'community'].includes(item.type)) {
            const current = this.actor.items.filter(i => i.type === item.type);
            if (current.length) await this.actor.deleteEmbeddedDocuments('Item', current.map(i => i.id));
        }
        const created = await this.actor.createEmbeddedDocuments('Item', sources([item]));
        if (item.type === 'class' && item.name === 'Sorcerer') await ensureSorcerousAttack(this.actor);
        return created;
    }

    async setupCharacter() {
        if (!this.isEditable) return;
        const archetypes = await documents('archetypes');
        const archetypeChoice = await selectionPrompt('Choose an Archetype', documentSelect('archetype', 'Archetype', archetypes), 'Continue', { choices: { archetype: { entries: archetypes } } });
        if (!archetypeChoice) return;
        const archetype = archetypes.find(e => e.uuid === archetypeChoice.archetype);
        const specialisations = (await documents('specialisations')).filter(e => e.system.linkedClass === archetype.uuid);
        const origins = await documents('origins'), communities = await documents('communities');
        let content = documentSelect('specialisation', 'Specialisation', specialisations) + documentSelect('origin', 'Origin', origins) + documentSelect('community', 'Community', communities);
        const startingTraitOptions = [
            ['', 'Choose…'], [2, '+2'], ['1a', '+1'], ['1b', '+1'], [0, '0'], [-1, '−1']
        ];
        const startingTraitValueByOption = { 2: 2, '1a': 1, '1b': 1, 0: 0, '-1': -1 };
        content += '<p class="heart-starting-traits-heading">Choose starting Trait values</p>';
        for (const trait of TRAITS) {
            content += selectHTML(trait, traitOptions[trait], startingTraitOptions, '');
        }
        content += inputHTML('experience1', 'First Experience (+2)') + inputHTML('experience2', 'Second Experience (+2)') + inputHTML('languages', 'Languages', 'Théan');
        const startingTalent = ['Sorcerer', 'Commander'].includes(archetype.name);
        content += startingTalent
            ? '<p>Continue to choose your starting Talent and equipment.</p>'
            : '<p>Continue to choose your starting equipment.</p>';
        const result = await selectionPrompt('Create Character', content, 'Continue', {
            choices: {
                specialisation: { entries: specialisations },
                origin: { entries: origins },
                community: { entries: communities }
            },
            valueLimits: { fields: TRAITS, limits: { 2: 1, '1a': 1, '1b': 1, 0: 1, '-1': 1 } }
        });
        if (!result) return;
        const selectedTraitOptions = TRAITS.map(trait => result[trait]);
        const numericTraitValues = selectedTraitOptions.map(value => startingTraitValueByOption[value]);
        if (numericTraitValues.some(value => value === undefined)
            || numericTraitValues.sort((a, b) => a - b).join(',') !== '-1,0,1,1,2') {
            return ui.notifications.warn('Assign exactly +2, +1, +1, 0, −1.');
        }
        if (!result.experience1.trim() || !result.experience2.trim()) return ui.notifications.warn('Give both starting Experiences a name.');
        const specialisation = specialisations.find(s => s.uuid === result.specialisation);
        const selected = [
            archetype, origins.find(e => e.uuid === result.origin), communities.find(e => e.uuid === result.community)
        ];
        // Validate every choice before creating any document.
        if (selected.some(e => !e) || !specialisation) return;
        const traditionKey = Object.values(CONFIG.DH.DOMAIN.domains)
            .find(d => d.tradition && specialisation.name === d.label)?.id;
        const talents = [];
        if (startingTalent && !(await this.learnTalent({
            domain: archetype.name === 'Sorcerer' ? traditionKey : null,
            tradition: traditionKey, granted: archetype.name === 'Commander',
            standardOnly: archetype.name === 'Commander', stage: talents,
            title: 'Create Character: Starting Talent', label: 'Continue'
        }))) return;
        const [weapons, armours] = await Promise.all([documents('weapons'), documents('armors')]);
        const equipmentChoices = startingEquipmentChoices(weapons, armours);
        if (!equipmentChoices.twoHanded.length || !equipmentChoices.primary.length
            || !equipmentChoices.secondary.length || !equipmentChoices.baselineDagger) {
            return ui.notifications.warn('The starting weapon lists are incomplete.');
        }
        let equipmentContent = '<p>Choose one two-handed primary weapon, or a one-handed primary weapon and a one-handed secondary weapon.</p>';
        equipmentContent += '<aside class="heart-equipment-reminder"><strong>Reminder:</strong> Your character also receives a baseline Dagger. It will be added to the sheet automatically and does not replace your chosen weapons.</aside>';
        equipmentContent += selectHTML('weaponLoadout', 'Weapon Loadout', [
            [STARTING_LOADOUTS.TWO_HANDED, 'Two-Handed Primary'],
            [STARTING_LOADOUTS.PRIMARY_AND_SECONDARY, 'One-Handed Primary + Secondary']
        ]);
        equipmentContent += `<section data-loadout="${STARTING_LOADOUTS.TWO_HANDED}">${documentSelect('twoHandedWeapon', 'Primary Weapon', equipmentChoices.twoHanded)}</section>`;
        equipmentContent += `<section data-loadout="${STARTING_LOADOUTS.PRIMARY_AND_SECONDARY}">${documentSelect('primaryWeapon', 'Primary Weapon', equipmentChoices.primary)}${documentSelect('secondaryWeapon', 'Secondary Weapon', equipmentChoices.secondary)}</section>`;
        equipmentContent += documentSelect('armour', 'Armour', equipmentChoices.armours, '', { emptyLabel: 'No Armour' });
        const equipmentResult = await selectionPrompt(
            'Create Character: Starting Equipment', equipmentContent, 'Create Character', {
                choices: {
                    twoHandedWeapon: { entries: equipmentChoices.twoHanded },
                    primaryWeapon: { entries: equipmentChoices.primary },
                    secondaryWeapon: { entries: equipmentChoices.secondary },
                    armour: { entries: equipmentChoices.armours }
                },
                configure: ({ form }) => {
                    const loadout = form.elements.namedItem('weaponLoadout');
                    const updateLoadout = () => {
                        for (const section of form.querySelectorAll('[data-loadout]')) {
                            const active = section.dataset.loadout === loadout.value;
                            section.hidden = !active;
                            for (const select of section.querySelectorAll('select')) select.disabled = !active;
                        }
                    };
                    loadout.addEventListener('change', updateLoadout);
                    updateLoadout();
                }
            }
        );
        if (!equipmentResult) return;
        const equipment = resolveStartingEquipment(equipmentResult, equipmentChoices);
        if (equipment.error) return ui.notifications.warn(equipment.error);
        await this.actor.createEmbeddedDocuments('Item', sources(selected));
        await this.actor.createEmbeddedDocuments('Item', sources([specialisation]));
        const updates = {
            'system.experiences': { [foundry.utils.randomID()]: { name: result.experience1, value: 2, core: true }, [foundry.utils.randomID()]: { name: result.experience2, value: 2, core: true } },
            'system.languages': result.languages,
            'system.biography.background': archetype.system.backgroundQuestions.map(q => `<p>${escapeHTML(q)}</p>`).join(''),
            'system.biography.connections': archetype.system.connections.map(q => `<p>${escapeHTML(q)}</p>`).join('')
        };
        for (const trait of TRAITS) {
            updates[`system.traits.${trait}.value`] = startingTraitValueByOption[result[trait]];
        }
        if (traditionKey) {
            updates['system.tradition'] = traditionKey;
            updates['system.spellcastingTrait'] = CONFIG.DH.DOMAIN.domains[traditionKey].spellcastingTrait;
        }
        if (traditionKey === 'sanderis') updates['system.resources.favor'] = { value: 3, max: 7 };
        await this.actor.update(updates);
        if (talents.length) await this.actor.createEmbeddedDocuments('Item', talents);
        await this.actor.createEmbeddedDocuments('Item', startingEquipmentSources(
            equipment, equipmentChoices.baselineDagger
        ));
        await ensureSorcerousAttack(this.actor);
        ui.notifications.info('Character created.');
    }

    async configureCharacter() {
        if (!this.isEditable) return;
        const s = this.actor.system;
        let content = inputHTML('xp', 'Cumulative XP', s.xp, 'number') + inputHTML('supply', 'Supply (0, 4, 6, 8, 10, 12)', s.supply, 'number') + inputHTML('languages', 'Languages', s.languages);
        for (const trait of TRAITS) content += inputHTML(trait, traitOptions[trait], s._source.traits[trait].value, 'number');
        content += selectHTML('tradition', 'Sorcerous Tradition granted by a feature', [['', 'None'], ...Object.values(CONFIG.DH.DOMAIN.domains).filter(d => d.tradition).map(d => [d.id, d.label])], s.tradition);
        content += selectHTML('spellcastingTrait', 'Spellcasting Trait', Object.entries(traitOptions), s.spellcastingTrait);
        content += selectHTML('unarmedTrait', 'Unarmed attack Trait', Object.entries(traitOptions).filter(([key]) => ['brawn', 'finesse'].includes(key) || s.class.value?.name === 'Brawler'), s.unarmedTrait);
        if (s.tradition === 'sanderis') content += selectHTML('dievaTaskPending', 'Dieva’s required task', [['true', 'Still pending'], ['false', 'Fulfilled']], String(s.dievaTaskPending));
        content += inputHTML('experience', 'Add an Experience (+2)') + '<p>Use this to record access granted by a feature. Read that feature’s conditions before choosing a Tradition.</p>';
        const result = await prompt('Character Options', content);
        if (!result) return;
        if (![0, 4, 6, 8, 10, 12].includes(Number(result.supply))) return ui.notifications.warn('Choose a valid Supply die.');
        const changes = { 'system.xp': Math.max(0, Number(result.xp)), 'system.supply': Number(result.supply), 'system.languages': result.languages, 'system.tradition': result.tradition, 'system.spellcastingTrait': result.spellcastingTrait };
        changes['system.unarmedTrait'] = result.unarmedTrait;
        if (s.tradition === 'sanderis' && game.user.isGM) changes['system.dievaTaskPending'] = result.dievaTaskPending === 'true';
        for (const trait of TRAITS) changes[`system.traits.${trait}.value`] = Number(result[trait]);
        if (result.experience.trim()) changes[`system.experiences.${foundry.utils.randomID()}`] = { name: result.experience, value: 2 };
        if (result.tradition === 'sanderis' && s.tradition !== 'sanderis') changes['system.resources.favor'] = { value: 3, max: 7 };
        await this.actor.update(changes);
    }

    async learnTalent({ granted = false, standardOnly = false, domain = null, stage = null, tradition = this.actor.system.tradition, title = 'Learn a Talent', label = 'Learn' } = {}) {
        const existing = [...this.actor.items.filter(i => i.type === 'domainCard').map(i => i.system), ...(stage ?? []).map(i => i.system)];
        const entries = (await documents('talents')).filter(e => (!domain || e.system.domain === domain) && (!standardOnly || !CONFIG.DH.DOMAIN.domains[e.system.domain]?.tradition) && !this.actor.items.some(i => i.type === 'domainCard' && i.sourceUuid === e.uuid) && !(stage ?? []).some(i => i._stats.compendiumSource === e.uuid) && !talentAccess({ domain: e.system.domain, granted, existing, tradition, domains: CONFIG.DH.DOMAIN.allDomains() }));
        if (!entries.length) { ui.notifications.warn('No eligible Talents are available.'); return false; }
        const domainKeys = new Set(entries.map(e => e.system.domain));
        const domains = Object.values(CONFIG.DH.DOMAIN.allDomains()).filter(d => domainKeys.has(d.id))
            .sort((a, b) => a.label.localeCompare(b.label));
        const content = selectHTML('talentDomain', 'Domain', domains.map(d => [d.id, d.label])) + documentSelect('talent', 'Talent', entries)
            + (granted ? '<p>This individually granted Talent leaves your Domain choices open.</p>' : '<p>Choose from up to two standard Domains and one granted Tradition. All learned Talents remain available.</p>');
        const result = await selectionPrompt(title, content, label, { choices: { talent: { entries, talent: true } }, filter: { domainField: 'talentDomain', talentField: 'talent' } });
        if (!result) return false;
        const entry = entries.find(e => e.uuid === result.talent);
        if (!entry || entry.system.domain !== result.talentDomain) return false;
        const data = sources([entry])[0]; data.system.granted = granted;
        const error = talentAccess({ domain: data.system.domain, granted, existing: [...this.actor.items.filter(i => i.type === 'domainCard').map(i => i.system), ...(stage ?? []).map(i => i.system)], tradition, domains: CONFIG.DH.DOMAIN.allDomains() });
        if (error) { ui.notifications.warn(error); return false; }
        if (stage) {
            if (stage.some(i => i._stats.compendiumSource === data._stats.compendiumSource)) { ui.notifications.warn('Choose different Talents.'); return false; }
            stage.push(data); return true;
        }
        const added = await this.actor.createEmbeddedDocuments('Item', [data]);
        return added.length > 0;
    }

    async advanceCharacter() {
        if (!this.isEditable) return;
        const actor = this.actor, s = actor.system;
        const level = s.levelData.level.current + 1;
        if (level > levelForXP(s.xp) || level > 10) return ui.notifications.warn(`The next level requires ${XP_THRESHOLDS[level - 1]} cumulative XP.`);
        let experience = null;
        if ([2, 5, 8].includes(level)) {
            const result = await prompt(`Level ${level}: New Experience`, inputHTML('experience', 'Experience (+2)'));
            if (!result?.experience.trim()) return;
            experience = result.experience.trim();
        }
        const history = foundry.utils.deepClone(s.advancementHistory);
        const choices = [];
        const talents = [];
        const updates = {};
        if ([5, 8].includes(level)) for (const t of TRAITS) updates[`system.traits.${t}.advancementMarked`] = false;
        if (rewardForLevel(level) === 'talent') {
            if (!(await this.learnTalent({ stage: talents }))) return;
        } else {
            // Collect both choices before making any change.
            for (let n = 0; n < 2; n++) {
                const options = [];
                for (let phase = 1; phase <= advancementPhaseForLevel(level); phase++) for (const [type, label] of Object.entries({ trait: '+1 to two unmarked Traits', hitPoint: '+1 HP slot', stress: '+1 Stress slot', experience: '+1 to two Experiences', evasion: '+1 Evasion', talent: 'Additional Talent' })) {
                    if (advancementAvailable(type, phase, level, [...history, { choices }])) options.push([`${phase}:${type}`, `Levels ${['1–4', '5–7', '8–10'][phase - 1]}: ${label}`]);
                }
                const result = await prompt(`Level ${level}: Advancement ${n + 1} of 2`, selectHTML('choice', 'Advancement', options));
                if (!result) return;
                const [phase, type] = result.choice.split(':');
                const choice = { phase: Number(phase), type, data: [] };
                if (type === 'trait' || type === 'experience') {
                    const available = type === 'trait'
                        ? TRAITS.filter(t => ([5, 8].includes(level) || !s.traits[t].advancementMarked) && !choices.some(c => c.type === 'trait' && c.data.includes(t))).map(t => [t, traitOptions[t]])
                        : Object.entries(s.experiences).map(([id, exp]) => [id, exp.name]);
                    if (available.length < 2) return ui.notifications.warn('This choice needs two eligible entries.');
                    const selected = await prompt('Choose two different entries', selectHTML('a', 'First', available) + selectHTML('b', 'Second', available, available[1][0]));
                    if (!selected || selected.a === selected.b) return ui.notifications.warn('Choose two different entries.');
                    choice.data = [selected.a, selected.b];
                }
                choices.push(choice);
            }
            // Talent acquisition validates its Domain rules before advancement is committed.
            for (const choice of choices) if (choice.type === 'talent' && !(await this.learnTalent({ stage: talents }))) return;
            for (const choice of choices) {
                if (choice.type === 'trait') for (const t of choice.data) {
                    updates[`system.traits.${t}.value`] = s._source.traits[t].value + 1;
                    updates[`system.traits.${t}.advancementMarked`] = true;
                }
                if (choice.type === 'experience') for (const id of choice.data) updates[`system.experiences.${id}.value`] = (updates[`system.experiences.${id}.value`] ?? s._source.experiences[id].value) + 1;
                const path = { hitPoint: 'resources.hitPoints.max', stress: 'resources.stress.max', evasion: 'evasion' }[choice.type];
                if (path) updates[`system.${path}`] = (updates[`system.${path}`] ?? (foundry.utils.getProperty(s._source, path) ?? (choice.type === 'stress' ? 6 : 0))) + 1;
            }
        }
        if (experience) updates[`system.experiences.${foundry.utils.randomID()}`] = { name: experience, value: 2 };
        history.push({ level, reward: rewardForLevel(level), choices, experience });
        updates['system.advancementHistory'] = history;
        updates['system.levelData.level.current'] = level;
        updates['system.levelData.level.changed'] = level;
        if (talents.length) {
            const added = await actor.createEmbeddedDocuments('Item', talents);
            if (added.filter(i => i.type === 'domainCard').length !== talents.length) return ui.notifications.warn('Talent acquisition failed; level has not advanced.');
        }
        await actor.update(updates);
        if (actor.system.class.value?.name === 'Commander' && level === 5) await this.learnTalent({ granted: true, standardOnly: true });
        ui.notifications.info(`Advanced to level ${level}.`);
    }

}
