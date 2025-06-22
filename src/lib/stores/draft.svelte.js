export let draft = $state({
    loaded: false,
    started: false,
    complete: false,
    totalTeams: 14,
    currentRound: 1,
    currentPick: 1,
    currentTeam: '',
    nextTeam: '',
    orderList: [],
    gate0: false,
    gate1: false,
    availablePlayers: []
});


export function getSetDraft() {
    return {
        get loaded() { return draft.loaded; },
        get started() { return draft.started; },
        get complete() { return draft.complete; },
        get totalTeams() { return draft.totalTeams; },
        get orderList() { return draft.orderList; },
        get gate0() { return draft.gate0; },
        get gate1() { return draft.gate1; },
        // get availablePlayers() { return draft.availablePlayers; },
        setLoaded(value) { draft.loaded = value; },
        setStarted(value) { draft.started = value; },
        setComplete(value) { draft.complete = value; },
        setTotalTeams(value) { draft.totalTeams = value; },
        setOrderList(value) { draft.orderList = value },
        setGate0(value) { draft.gate0 = value; },
        setGate1(value) { draft.gate1 = value; },
        setPlayers(value) { draft.availablePlayers = value }
    };
}