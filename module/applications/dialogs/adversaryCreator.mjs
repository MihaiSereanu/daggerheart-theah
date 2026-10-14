import {
    ADVERSARY_CREATION_TABLE,
    buildAdversarySource,
    getCreatorFields,
    getDamageFormula,
    getEffectiveValue
} from '../../heart-dagger/adversary-creator-data.mjs';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const FEATURE_PACK = 'daggerheart-theah.adversary-features';

export default class AdversaryCreator extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(options = {}) {
        super(options);
        this.stage = 'type';
        this.adversaryType = 'bruiser';
        this.features = [];
        this.featuresByUuid = new Map();
        this.selectedFeatureUuids = new Set();
        this.previewFeatureUuids = new Set();
    }

    get title() {
        return this.stage === 'type' ? 'Choose Adversary Type' : 'Create Adversary';
    }

    static DEFAULT_OPTIONS = {
        id: 'adversary-creator',
        tag: 'form',
        classes: ['daggerheart', 'dh-style', 'dialog', 'adversary-creator'],
        position: { width: 680, height: 'auto' },
        window: { icon: 'fa-solid fa-dragon', resizable: true },
        actions: {
            chooseType: this.#chooseType,
            changeType: this.#changeType,
            addExperience: this.#addExperience,
            removeExperience: this.#removeExperience,
            toggleFeaturePicker: this.#toggleFeaturePicker,
            toggleFeaturePreview: this.#toggleFeaturePreview,
            selectFeature: this.#selectFeature,
            removeFeature: this.#removeFeature
        },
        form: { handler: this.#createAdversary, closeOnSubmit: false }
    };

    static PARTS = {
        main: {
            template: 'systems/daggerheart-theah/templates/dialogs/adversary-creator.hbs',
            scrollable: ['.adversary-creator-content', '.adversary-feature-results']
        }
    };

    static injectSidebarButton(html) {
        if (html.dataset.tab !== 'actors' || !game.user.can('ACTOR_CREATE')) return;
        const headerActions = html.querySelector('.header-actions');
        if (!headerActions || headerActions.querySelector('.open-adversary-creator')) return;

        const button = document.createElement('button');
        button.type = 'button';
        button.classList.add('open-adversary-creator');
        button.innerHTML = '<i class="fa-solid fa-dragon"></i> Create Adversary';
        button.addEventListener('click', () => new AdversaryCreator().render({ force: true }));
        headerActions.append(button);
    }

    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.selectingType = this.stage === 'type';
        context.adversaryType = this.adversaryType;
        context.types = Object.entries(ADVERSARY_CREATION_TABLE).map(([id, data]) => ({
            id,
            label: data.label,
            selected: id === this.adversaryType
        }));

        if (!context.selectingType) {
            const benchmark = ADVERSARY_CREATION_TABLE[this.adversaryType];
            context.typeLabel = benchmark.label;
            context.fields = getCreatorFields(this.adversaryType);
            context.damage = benchmark.damage.formula
                ? { formula: benchmark.damage.formula, ranged: false }
                : {
                    ...benchmark.damage,
                    value: Math.round((benchmark.damage.min + benchmark.damage.max) / 2),
                    ranged: true
                };
            context.features = await this.#loadFeatures();
        }

        return context;
    }

    _attachPartListeners(partId, htmlElement, options) {
        super._attachPartListeners(partId, htmlElement, options);
        if (this.stage !== 'details') return;

        htmlElement.querySelectorAll('[data-stat-key], [data-damage-range]').forEach(input => {
            input.addEventListener('input', () => this.#refreshEffectiveValues());
        });
        htmlElement.querySelector('[name="champion"]')?.addEventListener('change', () => {
            this.#refreshEffectiveValues();
        });
        htmlElement.querySelector('[data-feature-search]')?.addEventListener('input', event => {
            const search = event.currentTarget.value.trim().toLocaleLowerCase();
            htmlElement.querySelectorAll('[data-feature-result][data-feature-uuid]').forEach(row => {
                row.hidden = Boolean(search) && !row.dataset.searchText.includes(search);
            });
        });

        this.#refreshEffectiveValues();
        this.#refreshFeatureSelection();
    }

    async #loadFeatures() {
        if (this.features.length) return this.features;
        const pack = game.packs.get(FEATURE_PACK);
        if (!pack) {
            ui.notifications.warn('The Adversary Features compendium is unavailable.');
            return [];
        }

        const documents = await pack.getDocuments();
        this.features = documents
            .filter(document => document.type === 'feature')
            .map(document => ({
                document,
                uuid: document.uuid,
                name: document.name,
                featureForm: game.i18n.localize(
                    CONFIG.DH.ITEM.featureForm[document.system.featureForm] ?? document.system.featureForm
                ),
                description: document.system.description ?? '',
                searchText: `${document.name} ${document.system.featureForm}`.toLocaleLowerCase()
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
        this.featuresByUuid = new Map(this.features.map(feature => [feature.uuid, feature]));
        return this.features;
    }

    #refreshEffectiveValues() {
        const champion = this.element.querySelector('[name="champion"]')?.checked ?? false;
        this.element.querySelectorAll('[data-stat-key]').forEach(input => {
            const key = input.dataset.statKey;
            const output = this.element.querySelector(`[data-stat-output="${key}"]`);
            if (!output) return;
            if (input.dataset.unavailable === 'true') {
                output.textContent = 'None';
                return;
            }

            const value = getEffectiveValue(key, input.value, champion);
            output.textContent = input.dataset.signed === 'true' && value >= 0 ? `+${value}` : String(value);

            const minimum = this.element.querySelector(`[data-range-min="${key}"]`);
            const maximum = this.element.querySelector(`[data-range-max="${key}"]`);
            if (minimum) minimum.textContent = getEffectiveValue(key, input.min, champion);
            if (maximum) maximum.textContent = getEffectiveValue(key, input.max, champion);
        });

        const benchmark = ADVERSARY_CREATION_TABLE[this.adversaryType];
        const damageInput = this.element.querySelector('[data-damage-range]');
        const damageOutput = this.element.querySelector('[data-damage-output]');
        if (damageOutput) {
            damageOutput.textContent = getDamageFormula(benchmark.damage, damageInput?.value, champion);
        }
        if (damageInput) {
            const minimum = this.element.querySelector('[data-damage-min]');
            const maximum = this.element.querySelector('[data-damage-max]');
            if (minimum) minimum.textContent = getEffectiveValue('damage', damageInput.min, champion);
            if (maximum) maximum.textContent = getEffectiveValue('damage', damageInput.max, champion);
        }
    }

    #refreshFeatureSelection() {
        const container = this.element.querySelector('[data-selected-features]');
        if (!container) return;
        container.replaceChildren();

        if (!this.selectedFeatureUuids.size) {
            const empty = document.createElement('p');
            empty.classList.add('adversary-feature-empty');
            empty.textContent = 'No features selected.';
            container.append(empty);
        }

        for (const uuid of this.selectedFeatureUuids) {
            const feature = this.featuresByUuid.get(uuid);
            if (!feature) continue;
            const chip = document.createElement('span');
            chip.classList.add('adversary-feature-chip');
            const name = document.createElement('span');
            name.textContent = feature.name;
            const remove = document.createElement('button');
            remove.type = 'button';
            remove.dataset.action = 'removeFeature';
            remove.dataset.featureUuid = uuid;
            remove.dataset.tooltip = `Remove ${feature.name}`;
            remove.setAttribute('aria-label', `Remove ${feature.name}`);
            remove.innerHTML = '<i class="fa-solid fa-xmark"></i>';
            chip.append(name, remove);
            container.append(chip);
        }

        this.element.querySelectorAll('[data-feature-result][data-feature-uuid]').forEach(row => {
            const selected = this.selectedFeatureUuids.has(row.dataset.featureUuid);
            const previewed = this.previewFeatureUuids.has(row.dataset.featureUuid);
            row.classList.toggle('selected', selected);
            const preview = row.querySelector('.adversary-feature-preview');
            if (preview) preview.hidden = !previewed;
            const previewButton = row.querySelector('[data-action="toggleFeaturePreview"]');
            if (previewButton) {
                previewButton.setAttribute('aria-expanded', String(previewed));
                previewButton.innerHTML = previewed
                    ? '<i class="fa-solid fa-eye-slash"></i> Hide'
                    : '<i class="fa-solid fa-eye"></i> Preview';
            }
            const button = row.querySelector('[data-action="selectFeature"]');
            if (button) {
                button.classList.toggle('selected', selected);
                button.setAttribute('aria-pressed', String(selected));
                button.innerHTML = selected
                    ? '<i class="fa-solid fa-check"></i> Selected'
                    : '<i class="fa-solid fa-plus"></i> Add';
            }
        });
    }

    static #chooseType(_event, target) {
        const select = target.closest('form').querySelector('[name="adversaryType"]');
        this.adversaryType = select.value;
        this.stage = 'details';
        this.render({ force: true });
    }

    static #changeType() {
        this.stage = 'type';
        this.render({ force: true });
    }

    static #addExperience() {
        const list = this.element.querySelector('[data-experience-list]');
        const row = document.createElement('div');
        row.classList.add('adversary-experience-row');
        row.innerHTML = `
            <input type="text" name="experience" placeholder="Experience">
            <button type="button" data-action="removeExperience" aria-label="Remove experience"
                data-tooltip="Remove experience"><i class="fa-solid fa-trash"></i></button>
        `;
        list.append(row);
        row.querySelector('input').focus();
    }

    static #removeExperience(_event, target) {
        target.closest('.adversary-experience-row')?.remove();
    }

    static #toggleFeaturePicker(_event, target) {
        const picker = this.element.querySelector('[data-feature-picker]');
        picker.hidden = !picker.hidden;
        target.setAttribute('aria-expanded', String(!picker.hidden));
        if (!picker.hidden) picker.querySelector('[data-feature-search]')?.focus();
    }

    static #selectFeature(_event, target) {
        const uuid = target.closest('[data-feature-uuid]')?.dataset.featureUuid;
        if (!uuid) return;
        if (this.selectedFeatureUuids.has(uuid)) this.selectedFeatureUuids.delete(uuid);
        else this.selectedFeatureUuids.add(uuid);
        this.#refreshFeatureSelection();
    }

    static #toggleFeaturePreview(_event, target) {
        const uuid = target.closest('[data-feature-uuid]')?.dataset.featureUuid;
        if (!uuid) return;
        if (this.previewFeatureUuids.has(uuid)) this.previewFeatureUuids.delete(uuid);
        else this.previewFeatureUuids.add(uuid);
        this.#refreshFeatureSelection();
    }

    static #removeFeature(_event, target) {
        this.selectedFeatureUuids.delete(target.dataset.featureUuid);
        this.#refreshFeatureSelection();
    }

    static async #createAdversary(_event, form, _formData) {
        const name = form.querySelector('[name="name"]').value.trim();
        if (!name) return ui.notifications.error('Enter an adversary name.');

        const stats = Object.fromEntries(
            Array.from(form.querySelectorAll('[data-stat-key]')).map(input => [input.dataset.statKey, Number(input.value)])
        );
        const damageInput = form.querySelector('[data-damage-range]');
        if (damageInput) stats.damage = Number(damageInput.value);

        const featureSources = Array.from(this.selectedFeatureUuids, uuid => {
            const feature = this.featuresByUuid.get(uuid)?.document;
            if (!feature) return null;
            const source = feature.toObject();
            source._stats = { ...source._stats, compendiumSource: feature.uuid };
            delete source._id;
            delete source._key;
            delete source.folder;
            delete source.ownership;
            return source;
        }).filter(Boolean);

        const source = buildAdversarySource({
            name,
            type: this.adversaryType,
            champion: form.querySelector('[name="champion"]').checked,
            description: form.querySelector('[name="description"]').value.trim(),
            motivesAndTactics: form.querySelector('[name="motivesAndTactics"]').value.trim(),
            experiences: Array.from(form.querySelectorAll('[name="experience"]'), input => input.value),
            stats,
            featureSources,
            createId: () => foundry.utils.randomID()
        });

        const actor = await CONFIG.Actor.documentClass.create(source, { renderSheet: true });
        if (!actor) return;
        ui.notifications.info(`Created ${actor.name}.`);
        await this.close({ submitted: true });
    }
}
