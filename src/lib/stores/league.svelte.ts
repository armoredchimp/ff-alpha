import type { Schedule } from "$lib/types/types";
import { CURRENT_SEASON, LEAGUE_ID_LOOKUP, SEASON_ID_LOOKUP } from "$lib/data/leagueConstants";


interface LeagueState {
    hasLeague: boolean;
    leagueId: number | null;
    canCreateLeague: boolean;
    countriesCode: number;
    numOfTeams: number;
    currentMatchweek: number;
    creationToken: string | null;
    tokenExpiresAt: string | null;
    loading: boolean;
    error: string | null;
    schedule: Schedule | null;
    seasonID: number | null;
    seasonNum: string;
}

interface LeagueStatusData {
    status: 'HAS_LEAGUE' | 'CAN_CREATE_LEAGUE';
    leagueId?: number;
    creationToken?: string;
    expiresAt?: string;
}

let leagueState = $state<LeagueState>({
    hasLeague: false,
    leagueId: null,
    canCreateLeague: false,
    countriesCode: 0,
    numOfTeams: 14,
    currentMatchweek: 0,
    creationToken: null,
    tokenExpiresAt: null,
    loading: false,
    error: null,
    schedule: null,
    seasonID: null,
    seasonNum: CURRENT_SEASON
});


export function getLeagueState(): LeagueState {
    return leagueState;
}

export function setTeamCount(numOfTeams: number) {
    leagueState.numOfTeams = numOfTeams
}

export function setCountry(countriesCode: number) {
    leagueState.countriesCode = countriesCode
    leagueState.seasonID = SEASON_ID_LOOKUP[countriesCode];
    leagueState.leagueId = LEAGUE_ID_LOOKUP[countriesCode]
}

export function getCountry(): number {
    return leagueState.countriesCode;
}

export function getSeasonID(): number | null {
    return leagueState.seasonID;

}
export function getLeagueID(): number | null {
    return leagueState.leagueId;
}

export function setMatchweek(currentMatchweek: number) {
    leagueState.currentMatchweek = currentMatchweek
}

export function getMatchweek(): number {
    return leagueState.currentMatchweek;
}

export function setLeagueSchedule(schedule: Schedule): void {
    leagueState.schedule = schedule
}

export function getSeasonNum(): string {
    return leagueState.seasonNum;
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

export function setLeagueId(id: number | null): void {
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
    leagueState.schedule = null;
}