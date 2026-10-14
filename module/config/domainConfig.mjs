import manuscriptDomains from './manuscript-domains.json' with { type: 'json' };
export const domains = manuscriptDomains;
export const allDomains = () => ({ ...game.system.settings.homebrew.domains, ...domains });
export const orderedDomains = () => Object.values(allDomains()).sort((a, b) => a.label.localeCompare(b.label));
export const subclassMap = {};
export const classMap = {};
// Keep the stored type so rules can distinguish ordinary and Sorcerous Talents; display both as Talent.
export const cardTypes = { ability: { id: 'ability', label: 'Talent', img: '' }, spell: { id: 'spell', label: 'Talent', img: '' } };
