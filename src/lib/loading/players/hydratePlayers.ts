import { playersByID } from '$lib/stores/generic.svelte';
import { createFormationStructure, hydrateSelected } from '$lib/utils/formation';
import { teams, playerTeam } from '$lib/stores/teams.svelte';
import type { Team, Player, FormationStructure } from '$lib/types/types';

type PositionArray = 'attackers' | 'midfielders' | 'defenders' | 'keepers' ;

export function hydratePlayers(): void {
    console.log('Starting player hydration...');
   
    // Define the position arrays for hydration
    const positionArrays: PositionArray[] = ['attackers', 'midfielders', 'defenders', 'keepers'];
   
    // Hydrate all teams
    for (const teamKey in teams) {
        const team = teams[teamKey as keyof typeof teams];

         if (team.formation) {
            // If selected doesn't exist or is empty, create the structure
            if (!team.selected || Object.keys(team.selected).length === 0) {
                team.selected = createFormationStructure(team.formation) as FormationStructure;
            }
        }
       
        positionArrays.forEach(position => {
            if (team[position] && Array.isArray(team[position])) {
                // Create a new array with player objects
                const hydratedPlayers = team[position].map((item: number | Player) => {
                    // If it's already a Player object, return it
                    if (typeof item === 'object' && item !== null && 'id' in item) {
                        return item as Player;
                    }
                    
                    // Otherwise, it's a player ID, so look it up
                    const playerId = item as number;
                    const player = playersByID[playerId];
                    if (!player) {
                        console.warn(`Player with ID ${playerId} not found in playersByID for ${team.name} ${position}`);
                        return null;
                    }
                    return player;
                }).filter((player): player is Player => player !== null);
               
                // Clear the array and push new values to maintain reactivity
                team[position].length = 0;
                team[position].push(...hydratedPlayers);
            }
        });

        if (team.selected || team.subs || team.unused) {
            hydrateSelected(team, playersByID);
        }
    }
   
    // Hydrate playerTeam
    positionArrays.forEach(position => {
        if (playerTeam[position] && Array.isArray(playerTeam[position])) {
            // Create a new array with player objects
            const hydratedPlayers = playerTeam[position].map((item: number | Player) => {
                // If it's already a Player object, return it
                if (typeof item === 'object' && item !== null && 'id' in item) {
                    return item as Player;
                }
                
                // Otherwise, it's a player ID, so look it up
                const playerId = item as number;
                const player = playersByID[playerId];
                if (!player) {
                    console.warn(`Player with ID ${playerId} not found in playersByID for ${playerTeam.name} ${position}`);
                    return null;
                }
                return player;
            }).filter((player): player is Player => player !== null);
           
            // Clear the array and push new values to maintain reactivity
            playerTeam[position].length = 0;
            playerTeam[position].push(...hydratedPlayers);
        }
    });
   
    console.log('Player hydration complete - all teams and playerTeam hydrated');
}