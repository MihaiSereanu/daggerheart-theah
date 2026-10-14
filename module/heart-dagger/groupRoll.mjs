import { prompt, selectHTML, pay, escapeHTML } from './dialogs.mjs';

export default class HeartGroupRollDialog {
    constructor(party) { this.party = party; }
    async render() {
        const members = this.party.system.partyMembers.filter(a => a.type === 'character');
        const result = await prompt('Group Action Roll', selectHTML('leader', 'Leader', members.map(a => [a.id, a.name])) + selectHTML('trait', 'Leader’s Trait', Object.entries(CONFIG.DH.ACTOR.abilities).map(([key, trait]) => [key, trait.label])) + members.map(a => `<label><input type="checkbox" name="aid-${a.id}" value="yes" checked> ${escapeHTML(a.name)} contributes (+1, mark 1 Stress)</label>`).join('<br>'));
        if (!result) return;
        const leader = members.find(a => a.id === result.leader);
        if (!leader?.isOwner) return ui.notifications.warn('The leader or GM must make the Group Action Roll.');
        const helpers = members.filter(a => a !== leader && result[`aid-${a.id}`] === 'yes');
        if (helpers.some(a => a.system.resources.stress.value >= a.system.resources.stress.max)) return ui.notifications.warn('A helper needs an unmarked Stress slot to contribute.');
        for (const helper of helpers) if (!(await pay(helper, 'stress', 1))) return;
        const abstaining = members.length - 1 - helpers.length;
        await leader.rollTrait(result.trait, { roll: { trait: result.trait, type: 'trait', baseModifiers: [{ label: 'Group contributions', value: helpers.length - abstaining }] } });
    }
}
