export let draft = $state({
    started: false,
    complete: false,
    currentRound: 1,
    currentPick: 1,
    currentTeam: '',
    nextTeam: '',
    orderList: [],
    gate0: false,
    gate1: false,
    // availablePlayers: []
});


export function getSetDraft() {
    return {
        get complete() { return draft.complete; },
        get orderList() { return draft.orderList; },
        get gate0() { return draft.gate0; },
        get gate1() { return draft.gate1; },
        // get availablePlayers() { return draft.availablePlayers; },
        setComplete(value) { draft.complete = value; },
        setOrderList(value) { draft.orderList = value },
        setGate0(value) { draft.gate0 = value; },
        setGate1(value) { draft.gate1 = value; },
        // setPlayers(value) { draft.availablePlayers = value }
    };
}