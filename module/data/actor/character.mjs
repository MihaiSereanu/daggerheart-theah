import { armourThresholds } from '../../heart-dagger/rules.mjs';
import { burden } from '../../config/generalConfig.mjs';
import ForeignDocumentUUIDField from '../fields/foreignDocumentUUIDField.mjs';
import DhLevelData from '../levelData.mjs';
import { commonActorRules } from './base.mjs';
import DhCreature from './creature.mjs';
import { attributeField, stressDamageReductionRule, bonusField, GoldField } from '../fields/actorField.mjs';
import { ActionField } from '../fields/actionField.mjs';
import DHCharacterSettings from '../../applications/sheets-configs/character-settings.mjs';
import { getArmorSources } from '../../helpers/utils.mjs';

export default class DhCharacter extends DhCreature {
    /**@override */
    static LOCALIZATION_PREFIXES = ['DAGGERHEART.ACTORS.Character'];

    /**@inheritdoc */
    static get metadata() {
        return foundry.utils.mergeObject(super.metadata, {
            label: 'TYPES.Actor.character',
            type: 'character',
            settingSheet: DHCharacterSettings,
            isNPC: false,
            hasInventory: true,
            quantifiable: ['loot', 'consumable']
        });
    }

    /**@inheritdoc */
    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            ...super.defineSchema(),
            traits: new fields.SchemaField({
                brawn: attributeField('DAGGERHEART.CONFIG.Traits.brawn.name'),
                charm: attributeField('DAGGERHEART.CONFIG.Traits.charm.name'),
                finesse: attributeField('DAGGERHEART.CONFIG.Traits.finesse.name'),
                instinct: attributeField('DAGGERHEART.CONFIG.Traits.instinct.name'),
                wits: attributeField('DAGGERHEART.CONFIG.Traits.wits.name')
            }),
            xp: new fields.NumberField({ initial: 0, min: 0, integer: true }),
            supply: new fields.NumberField({ initial: 6, choices: [0, 4, 6, 8, 10, 12], integer: true }),
            tradition: new fields.StringField({ initial: '', blank: true }),
            spellcastingTrait: new fields.StringField({ initial: 'instinct', choices: CONFIG.DH.ACTOR.abilities }),
            languages: new fields.StringField({ initial: 'Théan' }),
            advancementHistory: new fields.ArrayField(new fields.ObjectField()),
            stuntUsed: new fields.BooleanField({ initial: false }),
            unarmedTrait: new fields.StringField({ initial: 'brawn', choices: CONFIG.DH.ACTOR.abilities }),
            dievaTaskPending: new fields.BooleanField({ initial: false }),
            evasion: new fields.NumberField({ initial: 0, integer: true, label: 'DAGGERHEART.GENERAL.evasion' }),
            damageThresholds: new fields.SchemaField({
                major: new fields.NumberField({
                    integer: true,
                    initial: 0,
                    label: 'DAGGERHEART.GENERAL.DamageThresholds.majorThreshold'
                }),
                severe: new fields.NumberField({
                    integer: true,
                    initial: 0,
                    label: 'DAGGERHEART.GENERAL.DamageThresholds.severeThreshold'
                })
            }),
            experiences: new fields.TypedObjectField(
                new fields.SchemaField({
                    name: new fields.StringField(),
                    value: new fields.NumberField({ integer: true, initial: 0 }),
                    description: new fields.StringField(),
                    core: new fields.BooleanField({ initial: false })
                })
            ),
            gold: new GoldField({
                initial: () => {
                    const homebrew = game.system.settings.homebrew;
                    const { coins, handfuls, bags, chests } = homebrew.currency;
                    return {
                        coins: coins.enabled ? coins.initialAmount : 0,
                        handfuls: handfuls.enabled ? handfuls.initialAmount : 0,
                        bags: bags.enabled ? bags.initialAmount : 0,
                        chests: chests.enabled ? chests.initialAmount : 0
                    };
                }
            }),
            scars: new fields.NumberField({ initial: 0, integer: true, label: 'DAGGERHEART.GENERAL.scars' }),
            biography: new fields.SchemaField({
                background: new fields.HTMLField(),
                connections: new fields.HTMLField(),
                characteristics: new fields.SchemaField({
                    pronouns: new fields.StringField({}),
                    age: new fields.StringField({}),
                    faith: new fields.StringField({})
                })
            }),
            attack: new ActionField({
                type: 'attack',
                persisted: false,
                initial: () => ({
                    name: _loc('DAGGERHEART.GENERAL.unarmedAttack'),
                    img: 'icons/skills/melee/unarmed-punch-fist-yellow-red.webp',
                    _id: CONFIG.DH.ACTOR.standardAttackId,
                    systemPath: 'attack',
                    chatDisplay: false,
                    type: 'attack',
                    range: 'melee',
                    target: {
                        type: 'any',
                        amount: 1
                    },
                    roll: {
                        type: 'attack',
                        trait: 'brawn'
                    },
                    damage: {
                        main: {
                            type: ['physical'],
                            applyTo: 'hitPoints',
                            value: {
                                custom: {
                                    enabled: true,
                                    formula: '1d4 + @brawn'
                                }
                            }
                        }
                    }
                })
            }),
            levelData: new fields.EmbeddedDataField(DhLevelData),
            bonuses: new fields.SchemaField({
                roll: bonusField('DAGGERHEART.GENERAL.roll'),
                damage: bonusField('DAGGERHEART.GENERAL.damage'),
                healing: bonusField('DAGGERHEART.GENERAL.healing'),
                range: new fields.SchemaField({
                    weapon: new fields.NumberField({
                        integer: true,
                        initial: 0,
                        label: 'DAGGERHEART.GENERAL.Range.weapon'
                    }),
                    spell: new fields.NumberField({
                        integer: true,
                        initial: 0,
                        label: 'DAGGERHEART.GENERAL.Range.spell'
                    }),
                    other: new fields.NumberField({
                        integer: true,
                        initial: 0,
                        label: 'DAGGERHEART.GENERAL.Range.other'
                    })
                }),
                rally: new fields.ArrayField(new fields.StringField(), {
                    label: 'DAGGERHEART.CLASS.Feature.rallyDice'
                }),
                rest: new fields.SchemaField({
                    shortRest: new fields.SchemaField({
                        shortMoves: new fields.NumberField({
                            required: true,
                            integer: true,
                            initial: 0,
                            label: 'DAGGERHEART.GENERAL.Bonuses.rest.shortRest.shortRestMoves.label',
                            hint: 'DAGGERHEART.GENERAL.Bonuses.rest.shortRest.shortRestMoves.hint'
                        }),
                        longMoves: new fields.NumberField({
                            required: true,
                            integer: true,
                            initial: 0,
                            label: 'DAGGERHEART.GENERAL.Bonuses.rest.shortRest.longRestMoves.label',
                            hint: 'DAGGERHEART.GENERAL.Bonuses.rest.shortRest.longRestMoves.hint'
                        })
                    }),
                    longRest: new fields.SchemaField({
                        shortMoves: new fields.NumberField({
                            required: true,
                            integer: true,
                            initial: 0,
                            label: 'DAGGERHEART.GENERAL.Bonuses.rest.longRest.shortRestMoves.label',
                            hint: 'DAGGERHEART.GENERAL.Bonuses.rest.longRest.shortRestMoves.hint'
                        }),
                        longMoves: new fields.NumberField({
                            required: true,
                            integer: true,
                            initial: 0,
                            label: 'DAGGERHEART.GENERAL.Bonuses.rest.longRest.longRestMoves.label',
                            hint: 'DAGGERHEART.GENERAL.Bonuses.rest.longRest.longRestMoves.hint'
                        })
                    })
                }),
                maxLoadout: new fields.NumberField({
                    integer: true,
                    initial: 0,
                    label: 'DAGGERHEART.GENERAL.Bonuses.maxLoadout.label'
                })
            }, { persisted: false }),
            companion: new ForeignDocumentUUIDField({ type: 'Actor', nullable: true, initial: null }),
            rules: new fields.SchemaField({
                ...commonActorRules({
                    damageReduction: {
                        magical: new fields.BooleanField({
                            initial: false,
                            label: 'DAGGERHEART.GENERAL.Rules.damageReduction.magical.label',
                            hint: 'DAGGERHEART.GENERAL.Rules.damageReduction.magical.hint'
                        }),
                        physical: new fields.BooleanField({
                            initial: false,
                            label: 'DAGGERHEART.GENERAL.Rules.damageReduction.physical.label',
                            hint: 'DAGGERHEART.GENERAL.Rules.damageReduction.physical.hint'
                        }),
                        maxArmorMarked: new fields.SchemaField({
                            value: new fields.NumberField({
                                required: true,
                                integer: true,
                                initial: 1,
                                label: 'DAGGERHEART.GENERAL.Rules.damageReduction.maxArmorMarkedBonus'
                            }),
                            stressExtra: new fields.NumberField({
                                required: true,
                                integer: true,
                                initial: 0,
                                label: 'DAGGERHEART.GENERAL.Rules.damageReduction.maxArmorMarkedStress.label',
                                hint: 'DAGGERHEART.GENERAL.Rules.damageReduction.maxArmorMarkedStress.hint'
                            })
                        }),
                        stressDamageReduction: new fields.SchemaField({
                            severe: stressDamageReductionRule(
                                'DAGGERHEART.GENERAL.Rules.damageReduction.stress.severe'
                            ),
                            major: stressDamageReductionRule('DAGGERHEART.GENERAL.Rules.damageReduction.stress.major'),
                            minor: stressDamageReductionRule('DAGGERHEART.GENERAL.Rules.damageReduction.stress.minor'),
                            any: stressDamageReductionRule('DAGGERHEART.GENERAL.Rules.damageReduction.stress.any')
                        }),
                        increasePerArmorMark: new fields.NumberField({
                            integer: true,
                            initial: 1,
                            label: 'DAGGERHEART.GENERAL.Rules.damageReduction.increasePerArmorMark.label',
                            hint: 'DAGGERHEART.GENERAL.Rules.damageReduction.increasePerArmorMark.hint'
                        }),
                        disabledArmor: new fields.BooleanField({
                            intial: false,
                            label: 'DAGGERHEART.GENERAL.Rules.damageReduction.disabledArmor.label'
                        })
                    },
                    attack: {
                        damage: {
                            diceIndex: new fields.NumberField({
                                integer: true,
                                min: 0,
                                max: 5,
                                initial: 0,
                                label: 'DAGGERHEART.GENERAL.Rules.attack.damage.dice.label',
                                hint: 'DAGGERHEART.GENERAL.Rules.attack.damage.dice.hint'
                            }),
                            bonus: new fields.NumberField({
                                required: true,
                                initial: 0,
                                min: 0,
                                label: 'DAGGERHEART.GENERAL.Rules.attack.damage.bonus.label'
                            })
                        },
                        roll: new fields.SchemaField({
                            trait: new fields.StringField({
                                required: true,
                                choices: CONFIG.DH.ACTOR.abilities,
                                nullable: true,
                                initial: null,
                                label: 'DAGGERHEART.GENERAL.Rules.attack.roll.trait.label'
                            })
                        })
                    }
                }),
                dualityRoll: new fields.SchemaField({
                    defaultHopeDice: new fields.NumberField({
                        nullable: false,
                        required: true,
                        integer: true,
                        choices: CONFIG.DH.GENERAL.dieFaces,
                        initial: 12,
                        label: 'DAGGERHEART.ACTORS.Character.defaultHopeDice'
                    }),
                    defaultFearDice: new fields.NumberField({
                        nullable: false,
                        required: true,
                        integer: true,
                        choices: CONFIG.DH.GENERAL.dieFaces,
                        initial: 12,
                        label: 'DAGGERHEART.ACTORS.Character.defaultFearDice'
                    })
                }),
                burden: new fields.SchemaField({
                    ignore: new fields.BooleanField({ label: 'DAGGERHEART.ACTORS.Character.burden.ignore.label' })
                }),
                roll: new fields.SchemaField({
                    guaranteedCritical: new fields.BooleanField({
                        label: 'DAGGERHEART.ACTORS.Character.roll.guaranteedCritical.label',
                        hint: 'DAGGERHEART.ACTORS.Character.roll.guaranteedCritical.hint'
                    }),
                    defaultAdvantageDice: new fields.NumberField({
                        nullable: true,
                        required: true,
                        integer: true,
                        choices: CONFIG.DH.GENERAL.dieFaces,
                        initial: null,
                        label: 'DAGGERHEART.ACTORS.Character.defaultAdvantageDice'
                    }),
                    defaultDisadvantageDice: new fields.NumberField({
                        nullable: true,
                        required: true,
                        integer: true,
                        choices: CONFIG.DH.GENERAL.dieFaces,
                        initial: null,
                        label: 'DAGGERHEART.ACTORS.Character.defaultDisadvantageDice'
                    }),
                    comboDieIndex: new fields.NumberField({
                        integer: true,
                        min: 0,
                        max: 5,
                        initial: 0,
                        label: 'DAGGERHEART.ACTORS.Character.comboDieIndex.label',
                        hint: 'DAGGERHEART.ACTORS.Character.comboDieIndex.hint'
                    })
                })
            }, { persisted: false }),
            /** Accumulated armor score from all sources */
            armorScore: new fields.SchemaField({
                value: new fields.NumberField(),
                max: new fields.NumberField()
            }, { persisted: false })
        };
    }

    /* -------------------------------------------- */


    get ancestry() {
        return this.parent.items.find(x => x.type === 'ancestry') ?? null;
    }

    get community() {
        return this.parent.items.find(x => x.type === 'community') ?? null;
    }

    /** @returns {{ value?: DhItem; subclass?: DhItem }} */
    get class() {
        const value = this.parent.items.find(x => x.type === 'class' && !x.system.isMulticlass);
        const subclass = this.parent.items.find(x => x.type === 'subclass' && !x.system.isMulticlass);

        return {
            value,
            subclass
        };
    }

    /** @returns {{ value?: DhItem; subclass?: DhItem }} */
    get multiclass() {
        const value = this.parent.items.find(x => x.type === 'class' && x.system.isMulticlass);
        const subclass = this.parent.items.find(x => x.type === 'subclass' && x.system.isMulticlass);

        return {
            value,
            subclass
        };
    }

    get features() {
        return this.parent.items.filter(x => x.type === 'feature') ?? [];
    }

    get companionFeatures() {
        return this.companion ? this.companion.items.filter(x => x.type === 'feature') : [];
    }

    get needsCharacterSetup() {
        const { value: classValue, subclass } = this.class;
        return !(classValue || subclass || this.ancestry || this.community);
    }

    get spellcastModifierTrait() {
        if (!this.tradition && !this.class.subclass?.system.spellcastingTrait) return null;
        const key = CONFIG.DH.DOMAIN.allDomains()[this.tradition]?.spellcastingTrait ?? this.class.subclass?.system.spellcastingTrait ?? this.spellcastingTrait;
        return { ...this.traits[key], key };
    }

    get spellcastModifier() {
        return this.spellcastModifierTrait?.value ?? 0;
    }

    get spellcastingModifiers() {
        return {
            main: this.class.subclass?.system?.spellcastingTrait,
            multiclass: this.multiclass.subclass?.system?.spellcastingTrait
        };
    }

    get domains() { return [...new Set(this.parent.items.filter(i => i.type === 'domainCard' && !i.system.granted).map(i => i.system.domain))]; }

    get domainData() {
        const allDomainData = CONFIG.DH.DOMAIN.allDomains();
        return this.domains.map(key => {
            const domain = allDomainData[key];
            return {
                id: key,
                ...domain,
                label: game.i18n.localize(domain?.label) ?? key
            };
        });
    }

    get domainCards() { const total = this.parent.items.filter(i => i.type === 'domainCard').sort((a,b) => a.sort-b.sort); return { loadout: total, vault: [], total }; }

    get loadoutSlot() { return { current: this.domainCards.total.length, available: true }; }

    get armor() {
        return this.parent.items.find(x => x.type === 'armor' && x.system.equipped);
    }

    get activeBeastform() {
        return this.parent.effects.find(x => x.type === 'beastform');
    }

    /**
     * Gets the unarmed attackwhen no primary or secondary weapon is equipped.
     * Returns `null` if either weapon is equipped.
     * If the actor is in beastform, overrides the attack's name and image.
     *
     * @returns {DHAttackAction|null}
     */
    get usesUnarmed() {
        return !(this.primaryWeapon?.system?.equipped || this.secondaryWeapon?.system?.equipped);
    }

    /* All items are valid on characters */
    isItemValid(source) { return source.type !== 'transformation'; }

    isItemAvailable(item) {
        if (item.system.sorcerous && (this.activeBeastform || this.class.value?.name !== 'Sorcerer' || !this.tradition)) return false;
        if (this.activeBeastform && item.type === 'domainCard' && CONFIG.DH.DOMAIN.allDomains()[item.system.domain]?.tradition) return false;
        return super.isItemAvailable(item);
    }

    resolveTrait(trait) {
        if (trait === 'highest') {
            let highest = 'brawn';
            for (const [key, value] of Object.entries(this.traits)) {
                highest = value.value > this.traits[highest].value ? key : highest;
            }
            return highest;
        }

        return trait === 'spellcast' ? this.spellcastModifierTrait?.key ?? null : trait;
    }

    async updateArmorValue({ value: armorChange = 0, clear = false }) {
        if (armorChange === 0 && !clear) return;

        const increasing = armorChange >= 0;
        let remainingChange = Math.abs(armorChange);
        const orderedSources = getArmorSources(this.parent).filter(s => !s.disabled);

        const handleArmorData = (embeddedUpdates, doc, armorData) => {
            let usedArmorChange = 0;
            if (clear) {
                usedArmorChange -= armorData.current;
            } else {
                if (increasing) {
                    const remainingArmor = armorData.max - armorData.current;
                    usedArmorChange = Math.min(remainingChange, remainingArmor);
                    remainingChange -= usedArmorChange;
                } else {
                    const changeChange = Math.min(armorData.current, remainingChange);
                    usedArmorChange -= changeChange;
                    remainingChange -= changeChange;
                }
            }

            if (!usedArmorChange) return usedArmorChange;
            else {
                if (!embeddedUpdates[doc.id]) embeddedUpdates[doc.id] = { doc: doc, updates: [] };

                return usedArmorChange;
            }
        };

        const armorUpdates = [];
        const effectUpdates = [];
        for (const { document: armorSource } of orderedSources) {
            const usedArmorChange = handleArmorData(
                armorSource.type === 'armor' ? armorUpdates : effectUpdates,
                armorSource.parent,
                armorSource.type === 'armor' ? armorSource.system.armor : armorSource.system.armorData
            );
            if (!usedArmorChange) continue;

            if (armorSource.type === 'armor') {
                armorUpdates[armorSource.parent.id].updates.push({
                    _id: armorSource.id,
                    'system.armor.current': armorSource.system.armor.current + usedArmorChange
                });
            } else {
                effectUpdates[armorSource.parent.id].updates.push({
                    _id: armorSource.id,
                    'system.changes': armorSource.system.changes.map(change => ({
                        ...change,
                        value:
                            change.type === 'armor'
                                ? {
                                    ...change.value,
                                    current: armorSource.system.armorChange.value.current + usedArmorChange
                                }
                                : change.value
                    }))
                });
            }

            if (remainingChange === 0 && !clear) break;
        }

        const armorUpdateValues = Object.values(armorUpdates);
        for (const [index, { doc, updates }] of armorUpdateValues.entries())
            await doc.updateEmbeddedDocuments('Item', updates, { render: index === armorUpdateValues.length - 1 });

        const effectUpdateValues = Object.values(effectUpdates);
        for (const [index, { doc, updates }] of effectUpdateValues.entries())
            await doc.updateEmbeddedDocuments('ActiveEffect', updates, {
                render: index === effectUpdateValues.length - 1
            });
    }

    async updateArmorEffectValue({ uuid, value }) {
        const source = await foundry.utils.fromUuid(uuid);
        if (source.type === 'armor') {
            await source.update({
                'system.armor.current': source.system.armor.current + value
            });
        } else {
            const effectValue = source.system.armorChange.value;
            await source.update({
                'system.changes': [
                    {
                        ...source.system.armorChange,
                        value: { ...effectValue, current: effectValue.current + value }
                    }
                ]
            });
        }
    }

    get primaryWeapon() {
        return this.parent.items.find(x => x.type === 'weapon' && x.system.equipped && !x.system.secondary);
    }

    get secondaryWeapon() {
        return this.parent.items.find(x => x.type === 'weapon' && x.system.equipped && x.system.secondary);
    }

    get getWeaponBurden() {
        return this.primaryWeapon?.system?.burden === burden.twoHanded.value ||
            (this.primaryWeapon && this.secondaryWeapon)
            ? burden.twoHanded.value
            : this.primaryWeapon || this.secondaryWeapon
                ? burden.oneHanded.value
                : null;
    }

    get deathMoveViable() {
        const { characterDefault } = game.settings.get(
            CONFIG.DH.id,
            CONFIG.DH.SETTINGS.gameSettings.Automation
        ).defeated;
        const deathMoveOutcomeStatuses = Object.keys(CONFIG.DH.GENERAL.defeatedConditionChoices).filter(
            key => key !== characterDefault
        );
        const deathMoveNotResolved = this.parent.statuses.every(status => !deathMoveOutcomeStatuses.includes(status));

        const allHitPointsMarked =
            this.resources.hitPoints.max > 0 && this.resources.hitPoints.value >= this.resources.hitPoints.max;
        return deathMoveNotResolved && allHitPointsMarked;
    }

    get armorApplicableDamageTypes() {
        return {
            physical: !this.rules.damageReduction.magical,
            magical: !this.rules.damageReduction.physical
        };
    }

    static async unequipBeforeEquip(itemToEquip) {
        const primary = this.primaryWeapon,
            secondary = this.secondaryWeapon;
        if (itemToEquip.system.secondary) {
            if (primary && primary.burden === CONFIG.DH.GENERAL.burden.twoHanded.value) {
                await primary.update({ 'system.equipped': false });
            }

            if (secondary) {
                await secondary.update({ 'system.equipped': false });
            }
        } else {
            if (secondary && itemToEquip.system.burden === CONFIG.DH.GENERAL.burden.twoHanded.value) {
                await secondary.update({ 'system.equipped': false });
            }

            if (primary) {
                await primary.update({ 'system.equipped': false });
            }
        }
    }

    prepareBaseData() {
        super.prepareBaseData();
        this.armorScore = {
            max: this.armor?.system.armor.max ?? 0,
            value: this.armor?.system.armor.current ?? 0
        };
        this.evasion += this.class.value?.system?.evasion ?? 0;

        this.damageThresholds = armourThresholds(this.armor?.system);

        const globalHopeMax = game.system.settings.homebrew.maxHope;
        this.resources.hope.max = globalHopeMax;
        this.resources.hitPoints.max += this.class.value?.system?.hitPoints ?? 0;

        /* Companion Related Data */
        this.companionData = {
            levelupChoices: this.levelData.level.current - 1
        };
    }

    prepareDerivedData() {
        super.prepareDerivedData();

        if (!this.activeBeastform) {
            this.attack.roll.trait = this.unarmedTrait;
            let formula = '1d4';
            if (this.class.value?.name === 'Brawler') {
                formula = this.class.subclass?.name.startsWith('Pit Fighter') ? '1d10 + 1d8' : '1d8 + 1d6';
                if (this.usesUnarmed) this.evasion += 1;
            }
            this.attack.damage.main.value.custom = { enabled: true, formula: `${formula} + @${this.unarmedTrait}` };
        }

        this.resources.hope.max -= this.scars;
        if (this.companion) {
            for (let levelKey in this.companion.system.levelData.levelups) {
                const level = this.companion.system.levelData.levelups[levelKey];
                for (let selection of level.selections) {
                    switch (selection.type) {
                        case 'hope':
                            this.resources.hope.max += selection.value;
                            break;
                    }
                }
            }
        }

        this.resources.armor = {
            ...this.armorScore,
            label: 'DAGGERHEART.GENERAL.armor',
            isReversed: true
        };

        /* Add convience <dice>Faces properties for all diceIndexes */
        const { comboDieIndex } = this.rules.roll;
        const dice = { comboDieIndex };
        for (const dieKey of Object.keys(dice)) {
            const diceBaseKey = dieKey.replace('Index', '');
            this.rules.roll[`${diceBaseKey}Faces`] = CONFIG.DH.GENERAL.dieFaces[dice[dieKey]];
        }

        // Clamp resources (must be done last to ensure all updates occur)
        this.clampResources();
    }

    getRollData() {
        const data = super.getRollData();

        return {
            ...data,
            level: this.levelData.level.current
        };
    }

    async _preUpdate(changes, options, userId) {
        const allowed = await super._preUpdate(changes, options, userId);
        if (allowed === false) return;

        const favour = changes.system?.resources?.favor?.value;
        if (this.tradition === 'sanderis' && favour !== undefined) {
            if (this.dievaTaskPending && changes.system?.dievaTaskPending !== false && favour > (this.resources.favor?.value ?? 0)) {
                ui.notifications.warn('The dieva refuses power until its required task is fulfilled.'); return false;
            }
            if (favour === 0) changes.system.dievaTaskPending = true;
        }

        /* The first two experiences are always marked as core */
        if (changes.system?.experiences && Object.keys(this.experiences).length < 2) {
            const experiences = new Set(Object.keys(this.experiences));
            const changeExperiences = new Set(Object.keys(changes.system.experiences));
            const newExperiences = Array.from(changeExperiences.difference(experiences));

            for (var i = 0; i < Math.min(newExperiences.length, 2 - experiences.size); i++) {
                const experience = newExperiences[i];
                changes.system.experiences[experience].core = true;
            }
        }

        /* Scars can alter the amount of current hope */
        if (changes.system?.scars) {
            const diff = this.scars - changes.system.scars;
            const newHopeMax = this.resources.hope.max + diff;
            const newHopeValue = Math.min(newHopeMax, this.resources.hope.value);
            if (newHopeValue != this.resources.hope.value) {
                changes.system = foundry.utils.mergeObject(changes.system ?? {}, {
                    resources: {
                        hope: {
                            value: (changes.system?.resources?.hope?.value ?? 0) + newHopeMax
                        }
                    }
                });
            }
        }

        /* Force companion data prep */
        if (this.companion) {
            if (
                changes.system?.levelData?.level?.current !== undefined &&
                changes.system.levelData.level.current !== this._source.levelData.level.current
            ) {
                this.companion.update(this.companion.toObject(), { diff: false, recursive: false });
            }
        }
    }

    async _preDelete() {
        super._preDelete();

        if (this.companion) {
            this.companion.updateLevel(1);
        }
    }

    _getTags() {
        return [this.class.value?.name, this.class.subclass?.name, this.community?.name, this.ancestry?.name].filter(
            t => !!t
        );
    }

    static migrateData(source) {
        for (const trait of Object.values(source.traits ?? {})) {
            trait.advancementMarked ??= trait.tierMarked ?? false;
            delete trait.tierMarked;
        }
        for (const level of source.advancementHistory ?? []) for (const choice of level.choices ?? []) {
            choice.phase ??= choice.tier;
            delete choice.tier;
        }
        if (typeof source.scars === 'object') source.scars = 0;

        return super.migrateData(source);
    }
}
