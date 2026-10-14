import DhCharacter from './character.mjs';
import DhAdversary from './adversary.mjs';
import DhEnvironment from './environment.mjs';
import DhParty from './party.mjs';

export { DhCharacter, DhAdversary, DhEnvironment, DhParty };

export const config = {
    character: DhCharacter,
    adversary: DhAdversary,
    environment: DhEnvironment,
    party: DhParty
};
