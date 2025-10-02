import { teams, playerTeam } from "$lib/stores/teams.svelte";
import type { Schedule } from "$lib/types/types";

export function hydrateNextOpponents(schedule: Schedule, currentWeek: number) {
    // Get the current week's matchups
    const weekMatches = schedule[currentWeek.toString()];
    
    if (!weekMatches) {
        console.warn(`No matches found for week ${currentWeek}`);
        return;
    }
    
    // Clear all nextOpponentID first
    playerTeam.nextOpponentID = -1; // -1 indicates no opponent
    Object.values(teams).forEach(team => {
        team.nextOpponentID = -1;
    });
    
    weekMatches.forEach(([home, away]) => {
        // 0 = playerTeam, 1-19 = team1-team19
        
        const homeTeam = home === 0 ? playerTeam : teams[`team${home}`];
        const awayTeam = away === 0 ? playerTeam : teams[`team${away}`];
        
        if (homeTeam && awayTeam) {
            homeTeam.nextOpponentID = away;
            awayTeam.nextOpponentID = home;
        }
    });
    
    console.log('Next opponents hydrated for week', currentWeek);
}
