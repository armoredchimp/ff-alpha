import { getLeagueState } from '$lib/stores/league.svelte';

export function load({ data }) {
    // Get the league state to set the ID
    const leagueState = getLeagueState();
    leagueState.leagueId = data.leagueId;
    
    return {
        leagueId: data.leagueId,
        players: data.players,
        managers: data.managers
    };
}