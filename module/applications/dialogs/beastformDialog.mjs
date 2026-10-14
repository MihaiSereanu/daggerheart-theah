import { documentSelect, selectionPrompt } from '../../heart-dagger/selection-dialog.mjs';

export default class BeastformDialog {
    static async configure(config, item) {
        const pack = game.packs.get(`${CONFIG.DH.id}.beastforms`);
        const documents = [...game.items.filter(i => i.type === 'beastform'), ...await pack.getDocuments()]
            .sort((a, b) => a.name.localeCompare(b.name));
        const result = await selectionPrompt(item.name, documentSelect('form', 'Beastform', documents), 'Transform', {
            choices: { form: { entries: documents } }
        });
        if (!result) return { selected: null };
        const form = documents.find(d => d.uuid === result.form);
        const selected = form.toObject();
        const image = await game.system.api.data.items.DHBeastform.getWildcardImage(item.actor, form);
        if (image && !image.selectedImage) return { selected: null };
        if (image) selected.system[image.usesDynamicToken ? 'tokenRingImg' : 'tokenImg'] = image.selectedImage;
        const effect = selected.effects.find(e => e.type === 'beastform');
        for (const bonus of config.modifications.traitBonuses ?? []) {
            const existing = effect.system.changes.find(c => c.key === `system.traits.${form.system.mainTrait}.value`);
            if (existing) existing.value = Number(existing.value) + bonus.bonus;
            else effect.system.changes.push({ key: `system.traits.${form.system.mainTrait}.value`, type: 'add', value: bonus.bonus, phase: 'initial' });
        }
        return { selected, evolved: { form: null }, hybrid: null };
    }
}
