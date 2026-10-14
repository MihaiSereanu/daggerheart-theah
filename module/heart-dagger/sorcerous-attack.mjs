const pending = new Map();

/** Grant the manuscript attack once, through the ordinary weapon workflow. */
export async function ensureSorcerousAttack(actor) {
    if (actor?.type !== 'character' || !actor.isOwner || actor.pack
        || !actor.items.some(item => item.type === 'class' && item.name === 'Sorcerer')) return;
    if (pending.has(actor.uuid)) return pending.get(actor.uuid);
    const grant = (async () => {
        if (actor.items.some(item => item.type === 'weapon' && item.system.sorcerous)) return;
        const pack = game.packs.get(`${CONFIG.DH.id}.weapons`);
        const index = await pack.getIndex();
        const entry = await pack.getDocument(index.find(item => item.name === 'Sorcerous Attack')._id);
        if (actor.items.some(item => item.type === 'weapon' && item.system.sorcerous)) return;
        const data = entry.toObject();
        data._stats = { compendiumSource: entry.uuid };
        data.system.equipped = !actor.system.primaryWeapon;
        return actor.createEmbeddedDocuments('Item', [data], { keepId: true });
    })();
    pending.set(actor.uuid, grant);
    try { return await grant; } finally { pending.delete(actor.uuid); }
}

export async function grantExistingSorcerousAttacks() {
    if (!game.user.isActiveGM) return;
    for (const actor of game.actors) await ensureSorcerousAttack(actor);
    for (const scene of game.scenes) for (const token of scene.tokens) {
        if (!token.actorLink) await ensureSorcerousAttack(token.actor);
    }
}

