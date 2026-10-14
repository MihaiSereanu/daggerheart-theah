// Counters track expenditure; rule effects and per-target eligibility remain manual.
export function configureCounters(entry, id) {
    const text = entry.system.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    const name = entry.name.replace(/\s*-\s*(Action|Passive|Reaction)$/, '');
    const counter = (max, recovery = null, label = 'Uses') => ({ type: 'simple', value: 0, max, recovery, progression: 'increasing', label });
    if (['Gentle Words', 'Quick Assist', 'Walk Between Worlds'].includes(name)) {
        entry.system.resource = counter(name === 'Quick Assist' ? '@witsCount' : '@charmCount', name === 'Walk Between Worlds' ? null : 'shortRest');
    } else if (name === 'Creed') {
        entry.system.resource = { type: 'diceValue', value: 0, max: '@instinctCount', recovery: 'session', progression: 'increasing', dieFaces: 'd4', diceStates: {} };
    } else if (name === 'Gifted Performance') {
        entry.system.usageCounters = Object.fromEntries(['Relaxing Song', 'Inspiring Song'].map(label => [id(`${entry._id}:${label}`), { label, value: 0, max: '1', recovery: 'shortRest' }]));
    } else if (['Path of the Just', 'Cleansing Flames'].includes(name)) {
        // Once per recipient, rather than once for the entire ability.
        entry.system.usageNote = 'Once per target per Rest. Track affected targets in Notes.';
    } else if (name === 'Saw This Coming') {
        entry.system.usageNote = 'Once per PC per session. Track participating PCs in Notes.';
    } else if (name === 'Arcane Shield') {
        entry.system.resource = counter('1', null, 'Unavailable (0 / 1)');
        entry.system.usageNote = 'Set to 1 after reacting; reset to 0 after Refresh.';
    } else if (name === 'Path of the Merciful') {
        entry.system.resource = counter('1', 'shortRest', 'Enhanced healing uses');
        entry.system.usageNote = 'Each recipient can benefit once per Rest. Track affected targets in Notes.';
    } else if (name === 'Shrug It Off') {
        entry.system.resource = counter('1', 'shortRest', 'Unavailable (0 / 1)');
        entry.system.usageNote = 'Set to 1 when the d6 is 4 or lower; resets on Rest.';
    } else if (/once per (?:combat )?scene/i.test(text)) {
        entry.system.resource = counter('1', 'scene');
    } else if (/once per session/i.test(text)) {
        entry.system.resource = counter('1', 'session');
    } else if (/once per rest/i.test(text)) {
        entry.system.resource = counter('1', 'shortRest');
    }
    if (name === 'Unstoppable') {
        entry.system.usageCounters = { [id(`${entry._id}:Unstoppable Die`)]: { label: 'Unstoppable Die (0 = inactive)', value: 0, max: '4 + 2 * min(1, floor(@system.level / 5))', recovery: 'scene' } };
    }
    return entry;
}
