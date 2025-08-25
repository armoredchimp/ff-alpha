interface LeagueState {
    hasLeague: boolean;
    leagueId: string | null;
    canCreateLeague: boolean;
    countryCode: number;
    numOfTeams: number;
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
    countryCode: 0,
    numOfTeams: 14,
    creationToken: null,
    tokenExpiresAt: null,
    loading: false,
    error: null
});

export function getLeagueState(): LeagueState {
    return leagueState;
}

export function setTeamCount(numOfTeams: number) {
    leagueState.numOfTeams = numOfTeams
}

export function setCountry(countryCode: number) {
    leagueState.countryCode = countryCode
}

export function getCountry(): number {
    return leagueState.countryCode;
}

export const TABLE_PREFIXES: Record<number, string> = {
    1: 'prem',     // Premier League
    2: 'laliga',   // La Liga
    3: 'bundes',    // Bundesliga
    4: 'ligue1',   // Ligue 1
    5: 'seriea'    // Serie A
};

export const SEASON_ID_LOOKUP: Record<number, number> = {
    1: 23614,
    2: 23621,
    3: 23744,
    4: 23643,
    5: 23746
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