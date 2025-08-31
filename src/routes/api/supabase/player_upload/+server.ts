import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import { getLeagueId } from "$lib/server/auth";
import { getLeagueState } from "$lib/stores/league.svelte";
import { supabaseScaling } from "$lib/supabase/supaClient";

interface FormationStructure {
    [group: string]: {
        [position: string]: {
            players: number[];
            max: number;
            zone: string;
        };
    };
}

interface TeamPlayersUpload {
    team_id: number;
    league_id: string;
    attackers: number[];
    midfielders: number[];
    defenders: number[];
    keepers: number[];
    selected: FormationStructure;
    subs: number[];
    unused: number[];
}

const extractPlayerIds = (playerArray: any[]): number[] => {
    if (!Array.isArray(playerArray)) return [];
    return playerArray.map(player => {
        if (typeof player === 'number') return player;
        if (player && typeof player === 'object' && 'id' in player) return player.id;
        return null;
    }).filter((id): id is number => id !== null);
};

// Helper function to extract IDs from formation structure
const extractFormationIds = (selected: any): FormationStructure => {
    const lightweightSelected: FormationStructure = {};
    
    if (!selected || typeof selected !== 'object') return lightweightSelected;
    
    Object.entries(selected).forEach(([group, positions]) => {
        lightweightSelected[group] = {};
        
        if (positions && typeof positions === 'object') {
            Object.entries(positions).forEach(([pos, cfg]: [string, any]) => {
                if (cfg && typeof cfg === 'object') {
                    lightweightSelected[group][pos] = {
                        players: extractPlayerIds(cfg.players || []),
                        max: cfg.max || 0,
                        zone: cfg.zone || ''
                    };
                }
            });
        }
    });
    
    return lightweightSelected;
};

export const POST: RequestHandler = async ({ cookies, request }) => {
    try {
        const leagueId = getLeagueId(cookies);
        
        if (!leagueId) {
            return json({ error: 'No league ID found' }, { status: 400 });
        }
        
        // Get league state to know how many teams to process
        const leagueState = getLeagueState();
        
        if (!leagueState || !leagueState.numOfTeams) {
            return json({ error: 'Could not determine number of teams' }, { status: 400 });
        }
        
        const { teams: teamsData, playerTeam: playerTeamData } = await request.json();
        
        if (!teamsData && !playerTeamData) {
            return json({ error: 'No teams data provided' }, { status: 400 });
        }
        
        const teamPlayersToUpload: TeamPlayersUpload[] = [];
        
        // Process playerTeam (frontend_number 0)
        if (playerTeamData && playerTeamData.teamID) {
            const playerTeamUpload: TeamPlayersUpload = {
                team_id: playerTeamData.teamID,
                league_id: leagueId,
                attackers: extractPlayerIds(playerTeamData.attackers || []),
                midfielders: extractPlayerIds(playerTeamData.midfielders || []),
                defenders: extractPlayerIds(playerTeamData.defenders || []),
                keepers: extractPlayerIds(playerTeamData.keepers || []),
                selected: extractFormationIds(playerTeamData.selected),
                subs: extractPlayerIds(playerTeamData.subs || []),
                unused: extractPlayerIds(playerTeamData.unused || [])
            };
            teamPlayersToUpload.push(playerTeamUpload);
        }
        
        // Process AI teams (frontend_number 1 through numOfTeams-1)
        for (let i = 1; i < leagueState.numOfTeams; i++) {
            const teamKey = `team${i}`;
            const team = teamsData?.[teamKey];
            
            if (team && team.teamID) {
                const teamUpload: TeamPlayersUpload = {
                    team_id: team.teamID,
                    league_id: leagueId,
                    attackers: extractPlayerIds(team.attackers || []),
                    midfielders: extractPlayerIds(team.midfielders || []),
                    defenders: extractPlayerIds(team.defenders || []),
                    keepers: extractPlayerIds(team.keepers || []),
                    selected: extractFormationIds(team.selected),
                    subs: extractPlayerIds(team.subs || []),
                    unused: extractPlayerIds(team.unused || [])
                };
                teamPlayersToUpload.push(teamUpload);
            }
        }
        
        if (teamPlayersToUpload.length === 0) {
            return json({ error: 'No valid teams to upload' }, { status: 400 });
        }
        
        const { error: deleteError } = await supabaseScaling
            .from('team_players')
            .delete()
            .eq('league_id', leagueId);
        
        if (deleteError) {
            console.error('Error deleting existing team players:', deleteError);
        }
        

        const { data, error: insertError } = await supabaseScaling
            .from('team_players')
            .insert(teamPlayersToUpload);
        
        if (insertError) {
            console.error('Error inserting team players:', insertError);
            return json({ error: 'Failed to upload team players' }, { status: 500 });
        }
        
        console.log(`Successfully uploaded ${teamPlayersToUpload.length} teams for league ${leagueId}`);
        
        return json({ 
            success: true, 
            message: `Successfully uploaded ${teamPlayersToUpload.length} teams`,
            teamsUploaded: teamPlayersToUpload.length
        });
        
    } catch (error) {
        console.error('Error in upload teams endpoint:', error);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};