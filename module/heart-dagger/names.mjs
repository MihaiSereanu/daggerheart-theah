import aliases from '../config/manuscript-names.json' with { type: 'json' };
import counters from '../config/manuscript-counters.json' with { type: 'json' };
import artwork from '../config/manuscript-artwork.json' with { type: 'json' };

/** Update generated presentation and missing counters; preserve custom rules and artwork. */
export async function normalizeImportedNames() {
    if (!game.user.isActiveGM) return;
    const changesFor = items => items.map(item => {
        const alias = aliases[item.sourceUuid];
        const change = { _id: item.id };
        if (alias && item.name === alias.previous) change.name = alias.current;
        const oldLabel = item.system.resource?.label;
        if (oldLabel === 'Uses spent' || oldLabel === 'Enhanced healing uses spent') {
            change['system.resource.label'] = oldLabel.replace(/ spent$/, '');
        }
        const art = artwork[item.sourceUuid] ?? artwork[item.refreshSourceUuid];
        if (art) {
            if (art.previous.includes(item.img)) change.img = art.current;
            if (art.previousAttack.includes(item.system.attack?.img) && item.system.attack.img !== art.current) {
                change['system.attack.img'] = art.current;
            }
            if (item.effects.some(effect => art.previous.includes(effect.img))) {
                change.effects = item.effects.map(effect => ({ ...effect.toObject(),
                    img: art.previous.includes(effect.img) ? art.current : effect.img }));
            }
        }
        const config = counters[item.sourceUuid] ?? counters[item.refreshSourceUuid];
        if (config && item.system.description?.trim() === config.description.trim()) {
            if (config.resource && !item.system.resource) change['system.resource'] = config.resource;
            if (Object.keys(config.usageCounters).length && !Object.keys(item.system.usageCounters ?? {}).length) change['system.usageCounters'] = config.usageCounters;
            if (config.usageNote && !item.system.usageNote) change['system.usageNote'] = config.usageNote;
        }
        return Object.keys(change).length > 1 ? change : null;
    }).filter(Boolean);
    const worldItems = changesFor(game.items.contents);
    if (worldItems.length) await Item.updateDocuments(worldItems);
    const actors = new Map(game.actors.map(actor => [actor.uuid, actor]));
    for (const scene of game.scenes) for (const token of scene.tokens) {
        if (!token.actorLink && token.actor) actors.set(token.actor.uuid, token.actor);
    }
    for (const actor of actors.values()) {
        const changes = changesFor(actor.items.contents);
        if (changes.length) await actor.updateEmbeddedDocuments('Item', changes);
    }
}
