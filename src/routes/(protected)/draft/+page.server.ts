import { supabase, supabaseScaling } from '$lib/supabase/supaClient';
import { getLeagueId } from '$lib/server/auth';
import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
    const leagueId = getLeagueId(cookies);
    
    if (!leagueId) {
        throw redirect(303, '/create');
    }
    
    try {
        // Load players from mini table
        const { data: players, error: playersError } = await supabase
            .from('prem_mini_2425')
            .select('*')
            .order('transfer_value', { ascending: false });
            
        if (playersError) {
            console.error('Error loading players:', playersError);
        }
        
        // Load number of teams
        const { data: leagueData, error: numOfTeamsError }  = await supabaseScaling
            .from('leagues')
            .select('*')
            .eq('league_id', (leagueId))
            .single()

            console.log('League query result:', { leagueData, numOfTeamsError });

            if (numOfTeamsError) {
                console.error('Error fetching league:', numOfTeamsError);
            }

            const numOfTeams = leagueData?.total_teams || 14;

        // Load managers
        const { data: managers, error: managersError } = await supabase
            .from('active_managers')
            .select('*');
            
        if (managersError) {
            console.error('Error loading managers:', managersError);
        }
            
        console.log('About to return:', {  // Add this
            leagueId,
            numOfTeams,
            players: players?.length || 0,
            managers: managers?.length || 0
        });
            
        return {
            leagueId,
            numOfTeams,
            players: players || [],
            managers: managers || []
        };
    } catch (error) {
        console.error('Error in draft load:', error);
        return {
            leagueId,
            players: [],
            managers: []
        };
    }
};

export const actions: Actions = {
    insertTeams: async ({ request, cookies }) => {
        const leagueId = getLeagueId(cookies);
        if (!leagueId) {
            return fail(401, { error: 'No league ID found' });
        }
        
        const formData = await request.formData();
        const teamsJson = formData.get('teams') as string;
        
        try {
            const teams = JSON.parse(teamsJson);
            
            // Delete any existing teams for this league first
            const { error: deleteError } = await supabaseScaling
                .from('teams')
                .delete()
                .eq('league_id', leagueId);
            
            if (deleteError) {
                console.error('Error deleting existing teams:', deleteError);
            }
            
            const { data, error: supabaseError } = await supabaseScaling
                .from('teams')
                .insert(teams)
                .select('team_id, frontend_number'); 
            
            if (supabaseError) {
                console.error('Error inserting teams:', supabaseError);
                return fail(500, { error: 'Failed to insert teams' });
            }
            
            // Create a map of frontend_number to team_id
            const teamIdMap = {};
            if (data) {
                data.forEach(team => {
                    teamIdMap[team.frontend_number] = team.team_id;
                });
            }
            
            console.log('Teams successfully uploaded to Supabase:', data);
            console.log('Team ID map:', teamIdMap);
            
            return teamIdMap;
            
        } catch (error) {
            console.error('Failed to upload teams to Supabase:', error);
            return fail(500, { error: 'Failed to process teams data' });
        }
    },
    uploadTeamPlayers: async ({ request, cookies }) => {
    const leagueId = getLeagueId(cookies);
    if (!leagueId) {
        return fail(401, { error: 'No league ID found' });
    }
    
    console.log('League ID from cookie:', leagueId, typeof leagueId);
    
    const formData = await request.formData();
    const teamPlayersJson = formData.get('teamPlayers') as string;
    
    console.log('Received teamPlayers JSON:', teamPlayersJson);
    
    try {
        const teamPlayers = JSON.parse(teamPlayersJson);
        
        console.log('Parsed teamPlayers:', teamPlayers);
        
        // Add league_id to each team player record
        const teamPlayersWithLeagueId = teamPlayers.map(tp => ({
            ...tp,
            league_id: parseInt(leagueId)
        }));
        
        console.log('Team players with league ID:', JSON.stringify(teamPlayersWithLeagueId, null, 2));
        
        // Log the first record to see its structure
        if (teamPlayersWithLeagueId.length > 0) {
            console.log('First record structure:', {
                league_id: teamPlayersWithLeagueId[0].league_id,
                league_id_type: typeof teamPlayersWithLeagueId[0].league_id,
                team_id: teamPlayersWithLeagueId[0].team_id,
                team_id_type: typeof teamPlayersWithLeagueId[0].team_id,
                keys: Object.keys(teamPlayersWithLeagueId[0])
            });
        }
        
        // Delete any existing team_players for this league first
        const { error: deleteError } = await supabaseScaling
            .from('team_players')
            .delete()
            .eq('league_id', parseInt(leagueId));
        
        if (deleteError) {
            console.error('Error deleting existing team players:', deleteError);
        }
        
        // Insert new team players
        const { data, error } = await supabaseScaling
            .from('team_players')
            .insert(teamPlayersWithLeagueId);
        
        if (error) {
            console.error('Error inserting team players:', error);
            console.error('Failed data:', teamPlayersWithLeagueId);
            return fail(500, { error: 'Failed to insert team players' });
        }
        
        console.log('Team players successfully uploaded:', data);
        return { success: true };
        
    } catch (error) {
        console.error('Failed to process team players data:', error);
        return fail(500, { error: 'Failed to process team players data' });
    }
},
    draftTeamsFinalize: async ({ request, cookies }) => {
        const leagueId = getLeagueId(cookies);
        if (!leagueId) {
            return fail(401, { error: 'No league ID found' });
        }
        
        const formData = await request.formData();
        const teamUpdatesJson = formData.get('teamUpdates') as string;
        
        try {
            const teamUpdates = JSON.parse(teamUpdatesJson);
            
            // Update each team individually
            const updatePromises = teamUpdates.map(update => 
                supabaseScaling
                    .from('teams')
                    .update({
                        transfer_budget: update.transfer_budget,
                        player_count: update.player_count
                    })
                    .eq('team_id', update.team_id)
                    .eq('league_id', leagueId)
            );
            
            const results = await Promise.all(updatePromises);
            
            const failedUpdates = results.filter(result => result.error);
            if (failedUpdates.length > 0) {
                console.error('Some team updates failed:', failedUpdates);
                return fail(500, { error: 'Some team updates failed' });
            }
            
            console.log('Team stats successfully updated');
            return { success: true };
            
        } catch (error) {
            console.error('Failed to update team stats:', error);
            return fail(500, { error: 'Failed to update team stats' });
        }
    },

    getPlayerById: async ({ request }) => {
        const data = await request.formData();
        const playerId = data.get('playerId') as string;
        
        try {
            const { data: player, error } = await supabase
                .from('prem_stats_2425')
                .select('*')
                .eq('id', playerId)
                .single();

            if (error) {
                console.error(error);
                return fail(500, { error: 'Failed to fetch player' });
            }
            
            return { 
                success: true, 
                player 
            };
        } catch (error) {
            console.error('Error in getPlayerById:', error);
            return fail(500, { error: 'Failed to fetch player data' });
        }
    }
};