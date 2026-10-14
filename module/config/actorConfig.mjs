import { HordeAdversaryType } from '../data/actor/adversaryTypes/_module.mjs';

export const abilities = {
    "brawn": {
        "id": "brawn",
        "label": "Brawn",
        "verbs": [
            "Lift",
            "Smash",
            "Grapple"
        ]
    },
    "charm": {
        "id": "charm",
        "label": "Charm",
        "verbs": [
            "Attract",
            "Perform",
            "Deceive"
        ]
    },
    "finesse": {
        "id": "finesse",
        "label": "Finesse",
        "verbs": [
            "Sprint",
            "Dodge",
            "Hide"
        ]
    },
    "instinct": {
        "id": "instinct",
        "label": "Instinct",
        "verbs": [
            "Perceive",
            "Sense",
            "Navigate"
        ]
    },
    "wits": {
        "id": "wits",
        "label": "Wits",
        "verbs": [
            "Recall",
            "Analyze",
            "Comprehend"
        ]
    }
};

export const standardAttackId = '000BASEATTACK000';

export const featureProperties = Object.fromEntries(Object.entries(abilities).map(([key, trait]) => [key, { name: trait.label, path: actor => actor.system.traits[key].value }]));

export const adversaryTypes = {
    bruiser: {
        id: 'bruiser',
        label: 'DAGGERHEART.CONFIG.AdversaryType.bruiser.label',
        description: 'DAGGERHEART.ACTORS.Adversary.bruiser.description',
        bpCost: 4
    },
    horde: {
        id: 'horde',
        label: 'DAGGERHEART.CONFIG.AdversaryType.horde.label',
        description: 'DAGGERHEART.ACTORS.Adversary.horde.description',
        bpCost: 2
    },
    leader: {
        id: 'leader',
        label: 'DAGGERHEART.CONFIG.AdversaryType.leader.label',
        description: 'DAGGERHEART.ACTORS.Adversary.leader.description',
        bpCost: 3,
        bpDescription: 'DAGGERHEART.CONFIG.AdversaryType.leader.'
    },
    minion: {
        id: 'minion',
        label: 'DAGGERHEART.CONFIG.AdversaryType.minion.label',
        description: 'DAGGERHEART.ACTORS.Adversary.minion.description',
        bpCost: 1,
        partyAmountPerBP: true
    },
    ranged: {
        id: 'ranged',
        label: 'DAGGERHEART.CONFIG.AdversaryType.ranged.label',
        description: 'DAGGERHEART.ACTORS.Adversary.ranged.description',
        bpCost: 2
    },
    skulk: {
        id: 'skulk',
        label: 'DAGGERHEART.CONFIG.AdversaryType.skulk.label',
        description: 'DAGGERHEART.ACTORS.Adversary.skulk.description',
        bpCost: 2
    },
    social: {
        id: 'social',
        label: 'DAGGERHEART.CONFIG.AdversaryType.social.label',
        description: 'DAGGERHEART.ACTORS.Adversary.social.description',
        bpCost: 1
    },
    solo: {
        id: 'solo',
        label: 'DAGGERHEART.CONFIG.AdversaryType.solo.label',
        description: 'DAGGERHEART.ACTORS.Adversary.solo.description',
        bpCost: 5
    },
    standard: {
        id: 'standard',
        label: 'DAGGERHEART.CONFIG.AdversaryType.standard.label',
        description: 'DAGGERHEART.ACTORS.Adversary.standard.description',
        bpCost: 2
    },
    support: {
        id: 'support',
        label: 'DAGGERHEART.CONFIG.AdversaryType.support.label',
        description: 'DAGGERHEART.ACTORS.Adversary.support.description',
        bpCost: 1
    }
};

export const adversaryTypeModels = {
    horde: HordeAdversaryType
}

export const allAdversaryTypes = () => ({ ...adversaryTypes, ...game.system.settings.homebrew.adversaryTypes });

export const environmentTypes = {
    exploration: {
        label: 'DAGGERHEART.CONFIG.EnvironmentType.exploration.label',
        description: 'DAGGERHEART.CONFIG.EnvironmentType.exploration.description'
    },
    social: {
        label: 'DAGGERHEART.CONFIG.EnvironmentType.social.label',
        description: 'DAGGERHEART.CONFIG.EnvironmentType.social.description'
    },
    traversal: {
        label: 'DAGGERHEART.CONFIG.EnvironmentType.traversal.label',
        description: 'DAGGERHEART.CONFIG.EnvironmentType.traversal.description'
    },
    event: {
        label: 'DAGGERHEART.CONFIG.EnvironmentType.event.label',
        description: 'DAGGERHEART.CONFIG.EnvironmentType.event.description'
    }
};

export const adversaryTraits = {
    relentless: {
        name: 'DAGGERHEART.CONFIG.AdversaryTrait.relentless.name',
        description: 'DAGGERHEART.CONFIG.AdversaryTrait.relentless.description',
        tip: 'DAGGERHEART.CONFIG.AdversaryTrait.relentless.tip'
    },
    slow: {
        name: 'DAGGERHEART.CONFIG.AdversaryTrait.slow.name',
        description: 'DAGGERHEART.CONFIG.AdversaryTrait.slow.description',
        tip: 'DAGGERHEART.CONFIG.AdversaryTrait.slow.tip'
    },
    minion: {
        name: 'DAGGERHEART.CONFIG.AdversaryTrait.slow.name',
        description: 'DAGGERHEART.CONFIG.AdversaryTrait.slow.description',
        tip: 'DAGGERHEART.CONFIG.AdversaryTrait.slow.tip'
    }
};

export const tokenSize = {
    custom: {
        id: 'custom',
        value: 0,
        label: 'DAGGERHEART.GENERAL.custom'
    },
    tiny: {
        id: 'tiny',
        value: 1,
        label: 'DAGGERHEART.CONFIG.TokenSize.tiny'
    },
    small: {
        id: 'small',
        value: 2,
        label: 'DAGGERHEART.CONFIG.TokenSize.small'
    },
    medium: {
        id: 'medium',
        value: 3,
        label: 'DAGGERHEART.CONFIG.TokenSize.medium'
    },
    large: {
        id: 'large',
        value: 4,
        label: 'DAGGERHEART.CONFIG.TokenSize.large'
    },
    huge: {
        id: 'huge',
        value: 5,
        label: 'DAGGERHEART.CONFIG.TokenSize.huge'
    },
    gargantuan: {
        id: 'gargantuan',
        value: 6,
        label: 'DAGGERHEART.CONFIG.TokenSize.gargantuan'
    }
};

export const activeEffectExtraPaths = {
    adversary: [],
    character: [
        { value: '@cast', label: 'DAGGERHEART.CONFIG.ActiveEffectExtraPaths.cast.label', group: 'TYPES.Actor.character' }
    ],
    companion: [],
    allActors: [
        { value: '@fear', label: 'DAGGERHEART.CONFIG.ActiveEffectExtraPaths.fear.label', group: 'DAGGERHEART.CONFIG.ActiveEffectExtraPaths.allCategory' },
        { value: '@partySize', label: 'DAGGERHEART.CONFIG.ActiveEffectExtraPaths.partySize.label', group: 'DAGGERHEART.CONFIG.ActiveEffectExtraPaths.allCategory' }
    ]
}

export const levelChoices = {
    attributes: {
        name: 'attributes',
        title: '',
        choices: []
    },
    hitPointSlots: {
        name: 'hitPointSlots',
        title: '',
        choices: []
    },
    stressSlots: {
        name: 'stressSlots',
        title: '',
        choices: []
    },
    experiences: {
        name: 'experiences',
        title: '',
        choices: 'system.experiences',
        nrChoices: 2
    },
    proficiency: {
        name: 'proficiency',
        title: '',
        choices: []
    },
    armorOrEvasionSlot: {
        name: 'armorOrEvasionSlot',
        title: 'Permanently add one Armor Slot or take +1 to your Evasion',
        choices: [
            { name: 'Armor Marks +1', path: 'armor' },
            { name: 'Evasion +1', path: 'evasion' }
        ],
        nrChoices: 1
    },
    majorDamageThreshold2: {
        name: 'majorDamageThreshold2',
        title: '',
        choices: []
    },
    severeDamageThreshold2: {
        name: 'severeDamageThreshold2',
        title: '',
        choices: []
    },
    // minorDamageThreshold2: {
    //     name: 'minorDamageThreshold2',
    //     title: '',
    //     choices: [],
    // },
    severeDamageThreshold3: {
        name: 'severeDamageThreshold3',
        title: '',
        choices: []
    },
    // major2OrSevere4DamageThreshold: {
    //     name: 'major2OrSevere4DamageThreshold',
    //     title: 'Increase your Major Damage Threshold by +2 or Severe Damage Threshold by +4',
    //     choices: [{ name: 'Major Damage Threshold +2', path: 'major' }, { name: 'Severe Damage Threshold +4', path: 'severe' }],
    //     nrChoices: 1,
    // },
    // minor1OrMajor1DamageThreshold: {
    //     name: 'minor1OrMajor1DamageThreshold',
    //     title: 'Increase your Minor or Major Damage Threshold by +1',
    //     choices: [{ name: 'Minor Damage Threshold +1', path: 'minor' }, { name: 'Major Damage Threshold +1', path: 'major' }],
    //     nrChoices: 1,
    // },
    severeDamageThreshold4: {
        name: 'severeDamageThreshold4',
        title: '',
        choices: []
    },
    // majorDamageThreshold1: {
    //     name: 'majorDamageThreshold2',
    //     title: '',
    //     choices: [],
    // },
    subclass: {
        name: 'subclass',
        title: 'Select subclass to upgrade',
        choices: []
    },
    multiclass: {
        name: 'multiclass',
        title: '',
        choices: [{}]
    }
};

export const subclassFeatureLabels = {
    1: 'DAGGERHEART.ITEMS.DomainCard.foundationTitle',
    2: 'DAGGERHEART.ITEMS.DomainCard.specializationTitle',
    3: 'DAGGERHEART.ITEMS.DomainCard.masteryTitle'
};
