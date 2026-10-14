import { prompt, selectHTML, pay } from './dialogs.mjs';
import { emitGMUpdate, GMUpdateEvent } from '../systemRegistration/socket.mjs';

export async function soloStunt(actor) {
    if (actor.system.stuntUsed) return ui.notifications.warn('You have already initiated your Stunt this session.');
    const result = await prompt('Stunt', selectHTML('trait', 'Action Trait', Object.entries(CONFIG.DH.ACTOR.abilities).map(([key, trait]) => [key, trait.label])) + '<p>Spend 2 Hope, roll twice, and choose the desired result. If a successful Stunt deals damage, use critical damage. The chosen action result is otherwise unchanged.</p>', 'Declare Stunt');
    if (!result || !(await pay(actor, 'hope', 2))) return;
    await actor.update({ 'system.stuntUsed': true });
    const skips = { createMessage: true, resources: true, triggers: true };
    const first = await actor.rollTrait(result.trait, { skips });
    if (!first) return;
    const second = await actor.rollTrait(result.trait, { skips });
    if (!second) return;
    const rolls = [first.messageRoll, second.messageRoll];
    const selection = await prompt('Choose the Stunt result', selectHTML('index', 'Result', rolls.map((roll, i) => [i, `${roll.total}: ${roll.isCritical ? 'Critical' : roll.withHope ? 'Hope' : 'Fear'}`])), 'Resolve');
    if (!selection) return;
    const chosen = rolls[Number(selection.index)];
    await chosen.constructor.toMessage(chosen, { ...chosen.options, title: 'Stunt: chosen Action Roll' });
    // Account for the chosen result once, using the ordinary Duality resource rules.
    if (chosen.isCritical) await actor.update({
        'system.resources.hope.value': Math.min(actor.system.resources.hope.max, actor.system.resources.hope.value + 1),
        'system.resources.stress.value': Math.max(0, actor.system.resources.stress.value - 1)
    });
    else if (chosen.withHope) await actor.update({ 'system.resources.hope.value': Math.min(actor.system.resources.hope.max, actor.system.resources.hope.value + 1) });
    else {
        const key = CONFIG.DH.SETTINGS.gameSettings.Resources.Fear;
        const fear = Math.min(game.system.settings.homebrew.maxFear, game.settings.get(CONFIG.DH.id, key) + 1);
        await emitGMUpdate(GMUpdateEvent.UpdateFear, () => game.settings.set(CONFIG.DH.id, key, fear), fear);
    }
}
