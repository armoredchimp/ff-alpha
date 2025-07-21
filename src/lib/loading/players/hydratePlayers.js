import { playersByID } from '$lib/stores/generic.svelte';
import { teams, playerTeam } from '$lib/stores/teams.svelte';

export function hydratePlayers() {
    console.log('Starting player hydration...');
    
    // Define the position arrays for hydration
    const positionArrays = ['attackers', 'midfielders', 'defenders', 'keepers', 'selected', 'subs', 'unused'];
    
    // Hydrate all teams
    for (const teamKey in teams) {
        const team = teams[teamKey];
        
        positionArrays.forEach(position => {
            if (team[position] && Array.isArray(team[position])) {
                // Create a new array with player objects
                const hydratedPlayers = team[position].map(playerId => {
                    const player = playersByID[playerId];
                    if (!player) {
                        console.warn(`Player with ID ${playerId} not found in playersByID for ${team.name} ${position}`);
                        return null;
                    }
                    return player;
                }).filter(player => player !== null);
                
                // Clear the array and push new values to maintain reactivity
                team[position].length = 0;
                team[position].push(...hydratedPlayers);
            }
        });
    }
    
    // Hydrate playerTeam
    positionArrays.forEach(position => {
        if (playerTeam[position] && Array.isArray(playerTeam[position])) {
            // Create a new array with player objects
            const hydratedPlayers = playerTeam[position].map(playerId => {
                const player = playersByID[playerId];
                if (!player) {
                    console.warn(`Player with ID ${playerId} not found in playersByID for ${playerTeam.name} ${position}`);
                    return null;
                }
                return player;
            }).filter(player => player !== null);
            
            // Clear the array and push new values to maintain reactivity
            playerTeam[position].length = 0;
            playerTeam[position].push(...hydratedPlayers);
        }
    });
    
    console.log('Player hydration complete - all teams and playerTeam hydrated');
}