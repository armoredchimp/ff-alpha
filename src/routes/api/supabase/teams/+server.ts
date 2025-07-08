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
        
        // Create teams object formatted for the frontend
        const teams: Record<string, any> = {};
        
        teamsData.forEach(dbTeam => {
            const teamKey = `team${dbTeam.frontend_number}`;
            
            teams[teamKey] = {
                name: dbTeam.team_name || '',
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
            };

            console.log(teams[teamKey])
        });
        
        return json({ teams, success: true });
        
    } catch (error) {
        console.error('Error in teams endpoint:', error);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};