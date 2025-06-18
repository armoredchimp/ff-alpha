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
        
        // Load managers
        const { data: managers, error: managersError } = await supabase
            .from('active_managers')
            .select('*');
            
        if (managersError) {
            console.error('Error loading managers:', managersError);
        }
        
        return {
            leagueId,
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
                // Continue anyway - maybe there were no teams to delete
            }
            
            // Now insert the new teams
            const { data, error: supabaseError } = await supabaseScaling
                .from('teams')
                .insert(teams);

            if (supabaseError) {
                console.error('Error inserting teams:', supabaseError);
                return fail(500, { error: 'Failed to insert teams' });
            }

            console.log('Teams successfully uploaded to Supabase:', data);
            return { success: true };
            
        } catch (error) {
            console.error('Failed to upload teams to Supabase:', error);
            return fail(500, { error: 'Failed to process teams data' });
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