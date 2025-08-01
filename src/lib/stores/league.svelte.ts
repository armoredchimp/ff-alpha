interface LeagueState {
    hasLeague: boolean;
    leagueId: string | null;
    canCreateLeague: boolean;
    creationToken: string | null;
    tokenExpiresAt: string | null;
    loading: boolean;
    error: string | null;
}

interface LeagueStatusData {
    status: 'HAS_LEAGUE' | 'CAN_CREATE_LEAGUE';
    leagueId?: string;
    creationToken?: string;
    expiresAt?: string;
}

let leagueState = $state<LeagueState>({
    hasLeague: false,
    leagueId: null,
    canCreateLeague: false,
    creationToken: null,
    tokenExpiresAt: null,
    loading: false,
    error: null
});

export function getLeagueState(): LeagueState {
    return leagueState;
}

export function setLeagueStatus(data: LeagueStatusData): void {
    if (data.status === 'HAS_LEAGUE') {
        leagueState.hasLeague = true;
        leagueState.leagueId = data.leagueId || null;
        leagueState.canCreateLeague = false;
        leagueState.creationToken = null;
    } else if (data.status === 'CAN_CREATE_LEAGUE') {
        leagueState.hasLeague = false;
        leagueState.canCreateLeague = true;
        leagueState.creationToken = data.creationToken || null;
        leagueState.tokenExpiresAt = data.expiresAt || null;
    }
}

export function setLeagueId(id: string | null): void {
    leagueState.leagueId = id;
}

export function clearLeagueState(): void {
    leagueState.hasLeague = false;
    leagueState.leagueId = null;
    leagueState.canCreateLeague = false;
    leagueState.creationToken = null;
    leagueState.tokenExpiresAt = null;
    leagueState.loading = false;
    leagueState.error = null;
}