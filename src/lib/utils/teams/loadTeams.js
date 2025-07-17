import { teams, playerTeam } from '$lib/stores/teams.svelte.js';

/**
 * One-time load of teams data 
 */
export async function loadTeamsData() {
    try {
        const response = await fetch('/api/supabase/teams');
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to load teams:', errorData.error);
            return false;
        }
        
        const data = await response.json();
        
        if (data.teams) {
            // Bulk update the teams state object
            Object.entries(data.teams).forEach(([teamKey, teamData]) => {
                if (teams[teamKey]) {
                    Object.assign(teams[teamKey], teamData);
                }
            });
            
        // Handle playerTeam separately
        if (data.playerTeam) {
            Object.assign(playerTeam, data.playerTeam);
            console.log('Player team loaded successfully');
        }
        
            console.log('Teams loaded successfully');
            return true;
        }
        
        return false;
        
    } catch (error) {
        console.error('Error loading teams:', error);
        return false;
    }
}