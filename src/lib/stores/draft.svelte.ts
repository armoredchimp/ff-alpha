export class Draft {
    loaded: boolean = $state(false);
    started: boolean = $state(false);
    complete: boolean = $state(false);
    totalTeams: number = $state(14);
    currentRound: number = $state(1);
    currentPick: number = $state(1);
    currentTeam: string = $state('');
    nextTeam: string = $state('');
    orderList: any[] = $state([]);
    gate0: boolean = $state(false);
    gate1: boolean = $state(false);
    availablePlayers: any[] = $state([]);
}

export const traitsEffectsCache = new Map()
export const doubleNameFirsts = new Map(); // Tracks how many times a first part is used in double names
export const singleNameFirsts = new Map(); // Tracks first parts used as single names
export const usedSecondParts = new Set()
// Create and export a single instance
export const draft = new Draft();