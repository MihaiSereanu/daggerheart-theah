import { NullableBooleanField } from '../nullableBooleanField.mjs';

const fields = foundry.data.fields;

export default class CountdownField extends fields.ArrayField {
    constructor(options = {}, context = {}) {
        const element = new fields.SchemaField({
            ...game.system.api.data.countdowns.DhCountdown.defineSchema(),
            type: new fields.StringField({
                required: true,
                choices: CONFIG.DH.GENERAL.countdownTypes,
                initial: CONFIG.DH.GENERAL.countdownTypes.encounter.id,
                label: 'DAGGERHEART.GENERAL.type'
            }),
            name: new fields.StringField({
                required: true,
                initial: game.i18n.localize('DAGGERHEART.APPLICATIONS.Countdown.newCountdown'),
                label: 'DAGGERHEART.APPLICATIONS.Countdown.FIELDS.countdowns.element.name.label'
            }),
            // Hidden is nullable to allow defaulting to the global setting
            hidden: new NullableBooleanField({
                required: true,
                nullable: true,
                initial: false,
                label: 'DAGGERHEART.APPLICATIONS.Countdown.FIELDS.countdowns.element.hidden.label'
            }, { nullLabel: 'DAGGERHEART.APPLICATIONS.Countdown.hiddenNullLabel' })
        });
        super(element, options, context);
    }

    /**
     * Countdown Action Workflow part.
     * Must be called within Action context or similar. Requires a GM online to edit the game setting for countdowns.
     * @param {object} config    Object that contains workflow datas. Usually made from Action Fields prepareConfig methods.
     */
    static async execute() {
        return ui.notifications.warn('Countdowns are no longer available. Track this clock manually.');
    }

    /**
     * Update Action Workflow config object.
     * Must be called within Action context.
     * @param {object} config    Object that contains workflow datas. Usually made from Action Fields prepareConfig methods.
     */
    prepareConfig(config) {
        config.countdowns = this.countdown;
        return config;
    }
}
