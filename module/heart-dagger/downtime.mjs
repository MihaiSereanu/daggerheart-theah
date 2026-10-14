import { rest } from './dialogs.mjs';
export default class HeartDaggerDowntime {
    constructor(actor, ordinary) { this.actor = actor; this.ordinary = ordinary; }
    render() { return rest(this.actor, !this.ordinary); }
}
