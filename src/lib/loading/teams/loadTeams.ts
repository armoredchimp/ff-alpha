import { teams, playerTeam } from '$lib/stores/teams.svelte';

interface TeamApiResponse {
    name: string;
    teamID: number;
    draftOrder: number;
    playerCount: number;
    traits: any[];
    rivals: any[];
    transferBudget: number;
    wins: number;
    draws: number;
    losses: number;
    points: number;
    goalsFor: number;
    goalsAgainst: number;
    formation: string;
    manager: any;
    attackers: number[];
    midfielders: number[];
    defenders: number[];
    keepers: number[];
    selected: number[];
    subs: number[];
    unused: number[];
}

interface ApiResponse {
    teams: Record<string, TeamApiResponse>;
    playerTeam: TeamApiResponse | null;
    success: boolean;
    error?: string;
}

/**
 * Loads teams and hydrates players 
 */
export async function loadTeamsData(): Promise<boolean> {
    try {
        const response = await fetch('/api/supabase/teams');
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to load teams:', errorData.error);
            return false;
        }
        
        const data: ApiResponse = await response.json();
        
        if (data.teams) {
            // Bulk update the teams state object
            Object.entries(data.teams).forEach(([teamKey, teamData]) => {
                const team = teams[teamKey as keyof typeof teams];
                if (team) {
                    // Map the API response to match the store structure
                    team.name = teamData.name;
                    team.dbId = teamData.teamID; // Map teamID to dbId
                    team.draftOrder = teamData.draftOrder;
                    team.playerCount = teamData.playerCount;
                    team.traits = teamData.traits;
                    team.rivals = teamData.rivals;
                    team.transferBudget = teamData.transferBudget;
                    team.wins = teamData.wins;
                    team.draws = teamData.draws;
                    team.losses = teamData.losses;
                    team.points = teamData.points;
                    team.goalsFor = teamData.goalsFor;
                    team.goalsAgainst = teamData.goalsAgainst;
                    team.formation = teamData.formation;
                    team.manager = teamData.manager;
                    // Update player arrays - initially these will be player IDs
                    team.attackers = teamData.attackers || [];
                    team.midfielders = teamData.midfielders || [];
                    team.defenders = teamData.defenders || [];
                    team.keepers = teamData.keepers || [];
                    team.selected = teamData.selected || [];
                    team.subs = teamData.subs || [];
                    team.unused = teamData.unused || [];
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
                
                // Update player arrays - initially these will be player IDs
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