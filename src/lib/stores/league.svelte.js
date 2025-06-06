let leagueState = $state({
    hasLeague: false,
    leagueId: null,
    canCreateLeague: false,
    creationToken: null,
    tokenExpiresAt: null,
    loading: false,
    error: null
});

export function getLeagueState() {
    return leagueState;
}

export function setLeagueStatus(data) {
    if (data.status === 'HAS_LEAGUE') {
        leagueState.hasLeague = true;
        leagueState.leagueId = data.leagueId;
        leagueState.canCreateLeague = false;
        leagueState.creationToken = null;
    } else if (data.status === 'CAN_CREATE_LEAGUE') {
        leagueState.hasLeague = false;
        leagueState.canCreateLeague = true;
        leagueState.creationToken = data.creationToken;
        leagueState.tokenExpiresAt = data.expiresAt;
    }
}



export function clearLeagueState() {
    leagueState = {
        hasLeague: false,
        leagueId: null,
        canCreateLeague: false,
        creationToken: null,
        tokenExpiresAt: null,
        loading: false,
        error: null
    };
}