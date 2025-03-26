export let draft = $state({
    started: false,
    complete: false,
    currentRound: 1,
    currentPick: 1,
    currentTeam: '',
    nextTeam: ''
});

export let draftStageState = $state({
    complete: false,
    orderList: []
    // gate1: false
});



export function getDraftStage() {
    return {
        get complete() { return draftStageState.complete; },
        get orderList() { return draftStageState.orderList; },
        // get gate0() { return draftStageState.gate0; },
        // get gate1() { return draftStageState.gate1; },
        setComplete(value) { draftStageState.complete = value; },
        setOrderList(value) { draftStageState.orderList = value },
        // setGate0(value) { draftStageState.gate0 = value; },
        // setGate1(value) { draftStageState.gate1 = value; }
    };
}