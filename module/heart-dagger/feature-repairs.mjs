import repairs from '../config/manuscript-feature-repairs.json' with { type: 'json' };

const sourceFor = item => repairs[item.sourceUuid] ? item.sourceUuid : item.refreshSourceUuid;
const matchesDescription = (item, repair) => repair.previousDescriptions
    .some(text => text.trim() === (item.system.description ?? '').trim());
const untouchedFragment = (item, repair) => repair.previousNames.includes(item.name)
    && !item.system.resource && !item.effects.size && !item.system.actions?.size
    && !item.system.gmNotes?.trim() && !Object.keys(item.flags).length
    && (!item.system.featureForm || item.system.featureForm === 'passive') && !item.system.actorResources?.size;

function planRepairs(items, embedded) {
    const changes = new Map(), remove = [], localLinks = {};
    const replacements = Object.fromEntries(Object.entries(repairs).filter(([, r]) => r.fragment)
        .map(([source, r]) => [source, r.target]));
    for (const item of items) {
        const repair = repairs[sourceFor(item)];
        if (!repair || !matchesDescription(item, repair)) continue;
        if (repair.fragment && embedded) {
            const target = items.find(i => i.sourceUuid === repair.target && i.id !== item.id);
            const targetRepair = repairs[repair.target];
            const intactTarget = target && (target.system.description?.trim() === repair.description.trim()
                || (targetRepair && matchesDescription(target, targetRepair)));
            if (intactTarget && untouchedFragment(item, repair)) {
                remove.push(item.id);
                localLinks[item.uuid] = target.uuid;
                continue;
            }
        }
        const change = { _id: item.id, 'system.description': repair.description };
        if (repair.previousNames.includes(item.name)) change.name = repair.name;
        if (repair.fragment) change['_stats.compendiumSource'] = repair.target;
        changes.set(item.id, change);
    }
    Object.assign(replacements, localLinks);
    const targets = new Set(Object.values(replacements));
    for (const item of items) {
        const features = item._source.system.features;
        if (!Array.isArray(features)) continue;
        const seen = new Set();
        const updated = features.flatMap(feature => {
            const reference = typeof feature === 'string' ? feature : feature?.item;
            if (!reference) return [feature];
            const next = replacements[reference] ?? reference;
            if (targets.has(next) && seen.has(next)) return [];
            seen.add(next);
            return [typeof feature === 'string' ? next : { ...feature, item: next }];
        });
        if (JSON.stringify(features) !== JSON.stringify(updated)) {
            const change = changes.get(item.id) ?? { _id: item.id };
            change['system.features'] = updated;
            changes.set(item.id, change);
        }
    }
    return { changes: [...changes.values()], remove };
}

/** Correct only original parser output; retain edited descriptions and custom mechanics. */
export async function repairImportedFeatures() {
    if (!game.user.isActiveGM) return;
    const world = planRepairs(game.items.contents, false);
    if (world.changes.length) await Item.updateDocuments(world.changes);
    const actors = new Map(game.actors.map(actor => [actor.uuid, actor]));
    for (const scene of game.scenes) for (const token of scene.tokens) {
        if (!token.actorLink && token.actor) actors.set(token.actor.uuid, token.actor);
    }
    for (const actor of actors.values()) {
        const plan = planRepairs(actor.items.contents, true);
        if (plan.changes.length) await actor.updateEmbeddedDocuments('Item', plan.changes);
        if (plan.remove.length) await actor.deleteEmbeddedDocuments('Item', plan.remove);
    }
}
