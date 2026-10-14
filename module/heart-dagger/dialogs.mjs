import { emitGMUpdate, GMUpdateEvent } from '../systemRegistration/socket.mjs';
import { refreshIsAllowed, expireActiveEffects } from '../helpers/utils.mjs';
import { supplyAfterRoll } from './rules.mjs';
import { systemDialogClasses } from './dialog-style.mjs';

export const escapeHTML = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' })[c]);
export const optionsHTML = (entries, selected) => entries.map(([value, label]) => `<option value="${escapeHTML(value)}" ${String(value) === String(selected) ? 'selected' : ''}>${escapeHTML(label)}</option>`).join('');
export const selectHTML = (name, label, entries, selected) => `<div class="form-group"><label>${escapeHTML(label)}</label><select name="${name}">${optionsHTML(entries, selected)}</select></div>`;
export const inputHTML = (name, label, value = '', type = 'text') => `<div class="form-group"><label>${escapeHTML(label)}</label><input name="${name}" type="${type}" value="${escapeHTML(value)}"></div>`;
export async function prompt(title, content, label = 'Apply', options = {}) {
    return foundry.applications.api.DialogV2.wait({
        window: { title }, position: { width: 620 }, content, ...options,
        classes: systemDialogClasses([
            ...(options.classes ?? []),
            'heart-dialog'
        ]),
        buttons: [{ action: 'apply', label, default: true, callback: (_event, _button, dialog) => Object.fromEntries(new FormData(dialog.element.querySelector('form'))) }],
        rejectClose: false
    });
}
export async function updateActor(actor, changes) {
    if (actor.isOwner) return actor.update(changes);
    return emitGMUpdate(GMUpdateEvent.UpdateDocument, () => actor.update(changes), changes, actor.uuid);
}
export async function pay(actor, resource, cost) {
    const current = actor.system.resources[resource];
    if (!current || (current.isReversed ? current.max - current.value : current.value) < cost) {
        ui.notifications.warn(`Not enough ${resource} to pay the cost in full.`); return false;
    }
    await updateActor(actor, { [`system.resources.${resource}.value`]: current.value + (current.isReversed ? cost : -cost) });
    return true;
}

export async function refreshCounters(actor, allowedTypes) {
    const updates = [];
    for (const item of actor.items) {
        const change = { _id: item.id };
        for (const [key, counter] of Object.entries(item.system.usageCounters ?? {})) {
            if (refreshIsAllowed(allowedTypes, counter.recovery)) change[`system.usageCounters.${key}.value`] = 0;
        }
        for (const action of item.system.actions ?? []) {
            if (refreshIsAllowed(allowedTypes, action.uses?.recovery)) change[`system.actions.${action.id}.uses.value`] = 0;
        }
        if (item.system.resource && refreshIsAllowed(allowedTypes, item.system.resource.recovery)) {
            const resource = item.system.resource;
            change['system.resource.value'] = resource.progression === 'increasing' ? 0 : resource.max ? new Roll(resource.max, actor.getRollData()).evaluateSync().total : 0;
            for (const key of Object.keys(resource.diceStates ?? {})) change[`system.resource.diceStates.-=${key}`] = null;
        }
        if (Object.keys(change).length > 1) updates.push(change);
    }
    if (updates.length) await actor.updateEmbeddedDocuments('Item', updates);
}

export async function refreshRest(actor, extended) {
    await actor.toggleStatusEffect('unconscious', { active: false });
    await refreshCounters(actor, extended ? ['shortRest', 'longRest'] : ['shortRest']);
    await expireActiveEffects(actor, extended ? ['shortRest', 'longRest', 'scene'] : ['shortRest']);
}

export async function rest(actor, extended = false) {
    if (extended) {
        const result = await prompt('Extended Rest', '<p>After a week or more of rest, clear all HP, Stress, and Armour Slots, end temporary effects, refresh Rest abilities, and advance agreed projects.</p>', 'Complete Extended Rest');
        if (!result) return;
        await actor.update({ 'system.resources.hitPoints.value': 0, 'system.resources.stress.value': 0 });
        await actor.system.updateArmorValue({ clear: true });
        const temporary = actor.effects.filter(e => e.isTemporary || ['scene', 'shortRest', 'longRest'].includes(e.system.duration?.type));
        if (temporary.length) await actor.deleteEmbeddedDocuments('ActiveEffect', temporary.map(e => e.id));
        await refreshRest(actor, true);
        ui.notifications.info('Extended Rest completed.');
        return;
    }
    const moves = [['wounds', 'Tend to Wounds'], ['stress', 'Clear Stress'], ['armor', 'Repair Armour'], ['prepare', 'Prepare']];
    if (actor.system.tradition === 'sanderis') moves.push(['parley', 'Parley with your dieva']);
    const characters = game.actors.filter(a => a.type === 'character').map(a => [a.uuid, a.name]);
    const count = 2 + (actor.system.ancestry?.name === 'Ussura' ? 1 : 0);
    let content = '<p>Rest for at least eight hours. Choose different moves; each recovery move clears d6.</p>';
    for (let i = 0; i < count; i++) content += selectHTML(`move${i}`, `Move ${i + 1}`, moves, moves[i][0]);
    content += selectHTML('target', 'Wounds / armour recipient', characters, actor.uuid);
    content += selectHTML('friend', 'Prepare with an ally', [['', 'Prepare alone'], ...characters.filter(([uuid]) => uuid !== actor.uuid)]);
    const result = await prompt('Rest', content, 'Complete Rest');
    if (!result) return;
    const chosen = Array.from({ length: count }, (_, i) => result[`move${i}`]);
    if (new Set(chosen).size !== chosen.length) return ui.notifications.warn('Choose different downtime moves.');
    const target = await fromUuid(result.target);
    const report = [];
    for (const move of chosen) {
        if (move === 'parley') {
            if (actor.system.dievaTaskPending) return ui.notifications.warn('The dieva requires its task before granting Favour.');
            const favour = Math.clamp(actor.system.resources.favor.value + actor.system.traits.charm.value, 0, 7);
            await actor.update({ 'system.resources.favor.value': favour });
            if (favour === 7) await actor.rollTrait('wits', { roll: { trait: 'wits', type: 'reaction', difficulty: 15 }, actionType: 'reaction' });
            report.push(`Parley: Favour is now ${favour}/7.`);
        } else if (move === 'prepare') {
            const friend = result.friend ? await fromUuid(result.friend) : null;
            await updateActor(actor, { 'system.resources.hope.value': Math.min(actor.system.resources.hope.max, actor.system.resources.hope.value + (friend ? 2 : 1)) });
            if (friend) await updateActor(friend, { 'system.resources.hope.value': Math.min(friend.system.resources.hope.max, friend.system.resources.hope.value + 2) });
            report.push(`Prepare: ${friend ? 'each participant gains 2' : 'gain 1'} Hope.`);
        } else {
            const recipient = move === 'stress' ? actor : target;
            const roll = await new Roll('1d6').evaluate();
            await roll.toMessage({ flavor: `Rest: ${moves.find(m => m[0] === move)[1]}`, speaker: ChatMessage.getSpeaker({ actor }) });
            const amount = recipient.system.ancestry?.name === 'Sarmatia' ? 6 : roll.total;
            if (move === 'armor') {
                if (!recipient.isOwner) return ui.notifications.warn('The recipient or GM must clear their Armour Slots.');
                await recipient.system.updateArmorValue({ value: -amount });
            } else {
                const key = move === 'wounds' ? 'hitPoints' : 'stress';
                await updateActor(recipient, { [`system.resources.${key}.value`]: Math.max(0, recipient.system.resources[key].value - amount) });
            }
            report.push(`${escapeHTML(recipient.name)} clears ${amount} ${move}.`);
        }
    }
    await refreshRest(actor, false);
    if (actor.system.tradition === 'sanderis' && !chosen.includes('parley')) report.push(`No parley: the GM gains ${7 - actor.system.resources.favor.value} additional Fear.`);
    ui.notifications.info(report.join(' ') || 'Rest completed.');
}

export async function supply(actor) {
    const die = actor.system.supply;
    if (!die) return ui.notifications.warn('Supply is exhausted.');
    if (!(await pay(actor, 'stress', 1))) return;
    ui.notifications.info('Marked 1 Stress to use Supply.');
    const roll = await new Roll(`1d${die}`).evaluate();
    const next = supplyAfterRoll(die, roll.total);
    await actor.update({ 'system.supply': next });
    const outcome = next === die ? `Supply remains d${die}.`
        : next ? `Supply decreases from d${die} to d${next}.`
            : 'Supply is exhausted. The item can be used for this action, then breaks or is consumed.';
    const message = await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: 'Supply', flags: { [CONFIG.DH.id]: { noButtons: true } } }, { create: false });
    message.content = `${await roll.render()}<p class="supply-outcome">${escapeHTML(outcome)}</p>`;
    return ChatMessage.create(message);
}

export async function rite(actor) {
    if (actor.system.activeBeastform) return ui.notifications.warn('You cannot cast spells while in Beastform.');
    if (!actor.system.tradition) return ui.notifications.warn('A feature must grant a Sorcerous Tradition first.');
    const result = await prompt('Sorcerous Rite', selectHTML('scope', 'Scope assigned by the GM', [[1, 'Minor: 0 Stress, no roll'], [2, 'Moderate: 2 Stress, Difficulty 10'], [3, 'Major: 4 Stress, Difficulty 15'], [4, 'Legendary: 6 Stress, Difficulty 25']]) + inputHTML('bonus', 'Bonus', 0, 'number'));
    if (!result) return;
    const scope = Number(result.scope);
    const bonus = Number(result.bonus);
    if (![1, 2, 3, 4].includes(scope) || !Number.isFinite(bonus)) return ui.notifications.warn('Choose a valid scope and Bonus.');
    if (!(await pay(actor, 'stress', [0, 0, 2, 4, 6][scope]))) return;
    if (scope > 1) return actor.rollTrait(actor.system.spellcastModifierTrait.key, { roll: { trait: actor.system.spellcastModifierTrait.key, type: 'trait', difficulty: [0, 0, 10, 15, 25][scope], baseModifiers: [{ label: 'Bonus', value: bonus }] } });
}
