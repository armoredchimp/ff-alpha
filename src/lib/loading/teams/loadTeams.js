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
                    // Map the API response to match the store structure
                    teams[teamKey].name = teamData.name;
                    teams[teamKey].dbId = teamData.teamID; // Map teamID to dbId
                    teams[teamKey].draftOrder = teamData.draftOrder;
                    teams[teamKey].playerCount = teamData.playerCount;
                    teams[teamKey].traits = teamData.traits;
                    teams[teamKey].rivals = teamData.rivals;
                    teams[teamKey].transferBudget = teamData.transferBudget;
                    teams[teamKey].wins = teamData.wins;
                    teams[teamKey].draws = teamData.draws;
                    teams[teamKey].losses = teamData.losses;
                    teams[teamKey].points = teamData.points;
                    teams[teamKey].goalsFor = teamData.goalsFor;
                    teams[teamKey].goalsAgainst = teamData.goalsAgainst;
                    teams[teamKey].formation = teamData.formation;
                    
                    // Update player arrays
                    teams[teamKey].attackers = teamData.attackers || [];
                    teams[teamKey].midfielders = teamData.midfielders || [];
                    teams[teamKey].defenders = teamData.defenders || [];
                    teams[teamKey].keepers = teamData.keepers || [];
                    teams[teamKey].selected = teamData.selected || [];
                    teams[teamKey].subs = teamData.subs || [];
                    teams[teamKey].unused = teamData.unused || [];
                }
            });
           
            // Handle playerTeam separately
            if (data.playerTeam) {
                playerTeam.name = data.playerTeam.name;
                playerTeam.dbId = data.playerTeam.teamID; // Map teamID to dbId
                playerTeam.draftOrder = data.playerTeam.draftOrder;
                playerTeam.playerCount = data.playerTeam.playerCount;
                playerTeam.traits = data.playerTeam.traits;
                playerTeam.rivals = data.playerTeam.rivals;
                playerTeam.transferBudget = data.playerTeam.transferBudget;
                playerTeam.wins = data.playerTeam.wins;
                playerTeam.draws = data.playerTeam.draws;
                playerTeam.losses = data.playerTeam.losses;
                playerTeam.points = data.playerTeam.points;
                playerTeam.goalsFor = data.playerTeam.goalsFor;
                playerTeam.goalsAgainst = data.playerTeam.goalsAgainst;
                playerTeam.formation = data.playerTeam.formation;
                
                // Update player arrays
                playerTeam.attackers = data.playerTeam.attackers || [];
                playerTeam.midfielders = data.playerTeam.midfielders || [];
                playerTeam.defenders = data.playerTeam.defenders || [];
                playerTeam.keepers = data.playerTeam.keepers || [];
                playerTeam.selected = data.playerTeam.selected || [];
                playerTeam.subs = data.playerTeam.subs || [];
                playerTeam.unused = data.playerTeam.unused || [];
                
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