
export default class DhLevelData extends foundry.abstract.DataModel {
    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            level: new fields.SchemaField({
                current: new fields.NumberField({
                    required: true,
                    integer: true,
                    initial: 1,
                    label: 'DAGGERHEART.GENERAL.currentLevel'
                }),
                changed: new fields.NumberField({ required: true, integer: true, initial: 1 }),
                bonuses: new fields.TypedObjectField(new fields.NumberField({ integer: true, nullable: false }))
            }),
            levelups: new fields.ObjectField({ initial: {} })
        };
    }

    get canLevelUp() {
        return this.level.current < this.level.changed;
    }
}
