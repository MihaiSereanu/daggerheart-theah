import * as GENERAL from './generalConfig.mjs';
import * as DOMAIN from './domainConfig.mjs';
import * as ENCOUNTER from './encounterConfig.mjs';
import * as ACTOR from './actorConfig.mjs';
import * as RESOURCE from './resourceConfig.mjs';
import * as ITEM from './itemConfig.mjs';
import * as SETTINGS from './settingsConfig.mjs';
import * as EFFECTS from './effectConfig.mjs';
import * as ACTIONS from './actionConfig.mjs';
import * as FLAGS from './flagsConfig.mjs';
import * as HOOKS from './hooksConfig.mjs';
import * as TRIGGER from './triggerConfig.mjs';
import * as ITEMBROWSER from './itemBrowserConfig.mjs';
import * as LOOKUP from './lookupConfig.mjs';
import * as DICESONICE from './dsnConfig.mjs';

/** @type {"daggerheart-theah"} */
export const SYSTEM_ID = 'daggerheart-theah';

export const SYSTEM = {
    id: SYSTEM_ID,
    ENCOUNTER,
    GENERAL,
    DOMAIN,
    ACTOR,
    RESOURCE,
    ITEM,
    SETTINGS,
    EFFECTS,
    ACTIONS,
    FLAGS,
    DICESONICE,
    HOOKS,
    TRIGGER,
    ITEMBROWSER,
    LOOKUP,

    /**
     * Lore entries are used by items to link to the journal entry for the full description
     * These items can link to a journal directly, but this allows overrides without dealing with the
     * weaknesses of a uuid redirect (such as links ending with #headerName).
     * An empty string means that the journal isn't setup yet.
     */
    lore: { ancestry: {}, community: {}, transformation: {} }
};
