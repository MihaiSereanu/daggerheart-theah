import { prompt, selectHTML, optionsHTML, escapeHTML } from './dialogs.mjs';

export function documentSelect(name, label, entries, selected, { emptyLabel = null } = {}) {
    const options = entries.map(e => [e.uuid, e.name]);
    if (emptyLabel !== null) options.unshift(['', emptyLabel]);
    return selectHTML(name, label, options, selected)
        + `<section class="heart-choice-preview" data-preview="${escapeHTML(name)}" aria-live="polite"></section>`;
}

/** Show linked features for character options and rules previews for Talents. */
export async function selectionPrompt(title, content, label, {
    choices, filter = null, valueLimits = null, configure = null
}) {
    return prompt(title, content, label, {
        render: async (_event, dialog) => {
            const form = dialog.element.querySelector('form');
            const refresh = {};
            for (const [name, { entries, talent = false }] of Object.entries(choices)) {
                const select = form.elements.namedItem(name);
                const preview = form.querySelector(`[data-preview="${name}"]`);
                let revision = 0;
                refresh[name] = async () => {
                    const current = ++revision;
                    const entry = entries.find(e => e.uuid === select.value);
                    if (!entry) { preview.innerHTML = ''; return; }
                    let body = `<p class="heart-choice-link">@UUID[${entry.uuid}]</p>`;
                    if (talent || ['armor', 'weapon'].includes(entry.type)) body += entry.system.description;
                    else {
                        if (entry.type === 'class') body += `<p>Evasion ${entry.system.evasion}; HP ${entry.system.hitPoints}.</p>`;
                        if (entry.system.spellcastingTrait) body += `<p>Spellcasting Trait: ${escapeHTML(game.i18n.localize(CONFIG.DH.ACTOR.abilities[entry.system.spellcastingTrait].label))}.</p>`;
                        const features = (entry.system.features ?? []).map(f => {
                            const feature = f.item ?? f;
                            return typeof feature === 'string' ? feature : feature.uuid;
                        }).filter(Boolean);
                        if (features.length) body += `<ul>${features.map(uuid => `<li>@UUID[${uuid}]</li>`).join('')}</ul>`;
                    }
                    const enriched = await foundry.applications.ux.TextEditor.implementation.enrichHTML(body, {
                        relativeTo: entry, secrets: entry.isOwner
                    });
                    if (current === revision && dialog.rendered) {
                        preview.innerHTML = enriched;
                        const top = Math.max(20, Math.min(dialog.position.top,
                            window.innerHeight - dialog.element.offsetHeight - 20));
                        dialog.setPosition({ top });
                    }
                };
                select.addEventListener('change', () => { void refresh[name](); });
            }
            if (filter) {
                const domain = form.elements.namedItem(filter.domainField);
                const select = form.elements.namedItem(filter.talentField);
                const updateTalents = async () => {
                    const entries = choices[filter.talentField].entries.filter(e => e.system.domain === domain.value);
                    const selected = entries.some(e => e.uuid === select.value) ? select.value : entries[0]?.uuid;
                    select.innerHTML = optionsHTML(entries.map(e => [e.uuid, e.name]), selected);
                    await refresh[filter.talentField]();
                };
                domain.addEventListener('change', () => { void updateTalents(); });
                await updateTalents();
            }
            if (valueLimits) {
                const selects = valueLimits.fields.map(name => form.elements.namedItem(name)).filter(Boolean);
                for (const select of selects) for (const option of select.options) {
                    option.dataset.baseLabel = option.textContent;
                }
                const updateAvailableValues = () => {
                    const used = selects.reduce((counts, select) => {
                        if (select.value !== '') counts[select.value] = (counts[select.value] ?? 0) + 1;
                        return counts;
                    }, {});
                    for (const select of selects) for (const option of select.options) {
                        const limit = valueLimits.limits[option.value];
                        const count = used[option.value] ?? 0;
                        const current = option.value !== '' && option.value === select.value;
                        option.disabled = option.value !== '' && !current
                            && limit !== undefined && count >= limit;
                        option.textContent = option.dataset.baseLabel;
                        if (!current && option.disabled) option.textContent += ' — already selected';
                    }
                };
                for (const select of selects) select.addEventListener('change', updateAvailableValues);
                updateAvailableValues();
            }
            if (configure) await configure({ form, dialog, refresh });
            for (const [name, update] of Object.entries(refresh)) if (name !== filter?.talentField) await update();
        }
    });
}
