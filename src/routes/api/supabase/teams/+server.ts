import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import { getLeagueId } from "$lib/server/auth";
import { supabaseScaling } from "$lib/supabase/supaClient";

export const GET: RequestHandler = async ({ cookies }) => {
    try {
        const leagueId = getLeagueId(cookies);
        
        if (!leagueId) {
            return json({ error: 'No league ID found' }, { status: 400 });
        }
        
        // Load teams from database
        const { data: teamsData, error } = await supabaseScaling
            .from('teams')
            .select('*')
            .eq('league_id', leagueId)
            .order('frontend_number', { ascending: true });
        
        if (error) {
            console.error('Error loading teams:', error);
            return json({ error: 'Failed to load teams' }, { status: 500 });
        }
        
        if (!teamsData || teamsData.length === 0) {
            return json({ error: 'No teams found for this league' }, { status: 404 });
        }
        
        // Load team players from database
        const { data: teamPlayersData, error: playersError } = await supabaseScaling
            .from('team_players')
            .select('*')
            .eq('league_id', leagueId)

         if (playersError) {
            console.error('Error loading team players:', playersError);
            return json({ error: 'Failed to load team players' }, { status: 500 });
        }

        const teamPlayersMap = new Map();
        if (teamPlayersData) {
            teamPlayersData.forEach(tp => {
                teamPlayersMap.set(tp.team_id, {
                    attackers: tp.attackers || [],
                    midfielders: tp.midfielders || [],
                    defenders: tp.defenders || [],
                    keepers: tp.keepers || [],
                    selected: tp.selected || [],
                    subs: tp.subs || [],
                    unused: tp.unused || []
                })
            })
        }

        // Create teams object formatted for the frontend
        const teams: Record<string, any> = {};
        let playerTeam: any = null;

       teamsData.forEach(dbTeam => {
            // Link player data for this team
            const playerData = teamPlayersMap.get(dbTeam.team_id) || {
                attackers: [],
                midfielders: [],
                defenders: [],
                keepers: [],
                selected: [],
                subs: [],
                unused: []
            }

            const teamData = {
                name: dbTeam.team_name || '',
                teamID: dbTeam.team_id,
                draftOrder: dbTeam.frontend_number || 0,
                playerCount: dbTeam.player_count || 0,
                traits: dbTeam.traits || [],
                rivals: dbTeam.rivals || [],
                transferBudget: dbTeam.transfer_budget,
                wins: dbTeam.wins || 0,
                draws: dbTeam.draws || 0,
                losses: dbTeam.losses || 0,
                points: dbTeam.points || 0,
                goalsFor: dbTeam.goals_for || 0,
                goalsAgainst: dbTeam.goals_against || 0,
                formation: dbTeam.formation || '4-4-2',
                // Add player IDs
                attackers: playerData.attackers,
                midfielders: playerData.midfielders,
                defenders: playerData.defenders,
                keepers: playerData.keepers,
                selected: playerData.selected,
                subs: playerData.subs,
                unused: playerData.unused
            };
            
            if (dbTeam.frontend_number === 0) {
                // Assign to playerTeam instead of teams
                playerTeam = teamData;
            } else {
                const teamKey = `team${dbTeam.frontend_number}`;
                teams[teamKey] = teamData;
            }
        });
        
        return json({ teams, playerTeam, success: true });
        
    } catch (error) {
        console.error('Error in teams endpoint:', error);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};