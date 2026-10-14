import { talentAccess } from '../../heart-dagger/rules.mjs';
import BaseDataItem from './base.mjs';

export default class DHDomainCard extends BaseDataItem {
    static embedTemplate = 'systems/daggerheart-theah/templates/components/card/domain.hbs';

    /** @inheritDoc */
    static get metadata() {
        return foundry.utils.mergeObject(super.metadata, {
            label: 'TYPES.Item.domainCard',
            type: 'domainCard',
            hasDescription: true,
            hasResource: true,
            hasActions: true
        });
    }

    /** @inheritDoc */
    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            ...super.defineSchema(),
            granted: new fields.BooleanField({ initial: false }),
            domain: new fields.StringField({
                choices: CONFIG.DH.DOMAIN.allDomains,
                required: true,
                initial: CONFIG.DH.DOMAIN.domains.anchor.id
            }),
            level: new fields.NumberField({ initial: 1, integer: true }),
            recallCost: new fields.NumberField({ initial: 0, integer: true }),
            type: new fields.StringField({
                choices: CONFIG.DH.DOMAIN.cardTypes,
                required: true,
                initial: CONFIG.DH.DOMAIN.cardTypes.ability.id
            }),
            inVault: new fields.BooleanField({ initial: false }),
            vaultActive: new fields.BooleanField({
                required: true,
                nullable: false,
                initial: false
            }),
            loadoutIgnore: new fields.BooleanField({
                required: true,
                nullable: false,
                initial: false
            }),
            domainTouched: new fields.NumberField({
                nullable: true,
                initial: null
            })
        };
    }

    get domainLabel() {
        const allDomainData = CONFIG.DH.DOMAIN.allDomains();
        return game.i18n.localize(allDomainData[this.domain].label);
    }

    get isVaultSupressed() { return false; }

    get isDomainTouchedSuppressed() { return false; }

    async _preCreate(data, options, user) {
        const allowed = await super._preCreate(data, options, user);
        if (allowed === false) return false;
        this.updateSource({ inVault: false, recallCost: 0, level: 1 });
        if (this.actor?.type !== 'character') return;
        if (this.actor.items.some(i => i.type === 'domainCard' && i.sourceUuid === this.parent.sourceUuid)) {
            ui.notifications.warn('This character already knows this Talent.'); return false;
        }
        const error = talentAccess({ domain: this.domain, granted: this.granted, existing: this.actor.items.filter(i => i.type === 'domainCard').map(i => i.system), tradition: this.actor.system.tradition, domains: CONFIG.DH.DOMAIN.allDomains() });
        if (error) { ui.notifications.warn(error); return false; }
    }

    _getTags() { return [this.domainLabel]; }

    _getLabels() { return [this.domainLabel]; }

    async toEmbed(config = {}, options = {}) {
        // Card styling has certain defaults designed for embedding
        config.caption ??= false;
        config.cite ??= false;
        config.inline ??= true;

        const description = await this.getEnrichedDescription({ gmNotes: false, type: 'embed' }, options);
        const domains = CONFIG.DH.DOMAIN.allDomains();
        const content = await foundry.applications.handlebars.renderTemplate(this.constructor.embedTemplate, {
            item: this.parent,
            description,
            domain: foundry.utils.mergeObject({ color: 'black' }, domains[this.domain] ?? {}),
            cardType: CONFIG.DH.DOMAIN.cardTypes[this.type]
        })
        const container = document.createElement('div');
        container.innerHTML = content;
        if (['dark', 'light'].includes(config.theme)) {
            container.children[0].classList.add('themed', `theme-${config.theme}`);
        }
        return container.children;
    }

    /**
     * Switch Domain Card vault state
     * 
     * @param {Event} [event] - The triggering event passed to the action handler.
     * @param {boolean} [toVault] - The desired vault state. If omitted, toggles the current state.
     * @param {boolean} [isRecall] - True if recall cost dialog should be performed.
     * @returns {Promise<Document>} The promise resolving to the updated parent document,
     * or a warning notification result when max loadout is reached and not ignored for this domain card.
     */
    async toggleVault(event, toVault, isRecall) {
        return this.parent.update({ 'system.inVault': false, 'system.recallCost': 0 });
    }

    /**
     * Processes the stress cost associated with recalling an item from the vault.
     * 
     * @async
     * @param {Event} [event] - The triggering event passed to the action handler.
     * @returns {Promise<object|void>} Resolves to true if the cost is 0 or if dialog is validated, void if dialog is closed.
     */
    async onRecallCost(event) {
        return true;
    }
}
