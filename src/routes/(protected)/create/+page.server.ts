import { supabaseScaling } from '$lib/supabase/supaClient';
import { fail, redirect } from '@sveltejs/kit';
import { updateSession, getSession } from '$lib/server/auth';
import type { Actions } from './$types';

export const actions: Actions = {
    createLeague: async ({ request, cookies }) => {
        const session = getSession(cookies);
        
        if (!session) {
            return fail(401, { error: 'Not authenticated' });
        }
        
        const data = await request.formData();
        const leagueName = data.get('leagueName') as string;
        const selectedTeams = parseInt(data.get('selectedTeams') as string);
        const creationToken = data.get('creationToken') as string;
        
        if (!leagueName?.trim()) {
            return fail(400, { error: 'Please enter a league name' });
        }
        
        if (!creationToken) {
            return fail(403, { error: 'Not authorized to create a league' });
        }
        
        try {
            // Create league in Supabase
            const { data: league, error: supabaseError } = await supabaseScaling
                .from('leagues')
                .insert({
                    creator: session.userId,
                    league_name: leagueName,
                    total_teams: selectedTeams,
                    countries_code: 1, // England = 1 for now
                    draft_complete: false
                })
                .select()
                .single();
                
            if (supabaseError) {
                console.error('Supabase error:', supabaseError);
                return fail(500, { error: 'Failed to create league in database' });
            }
            
            // Update the session with the new league ID directly
            const updated = await updateSession(cookies, { 
                leagueId: league.league_id.toString() 
            });
            
            if (!updated) {
                console.error('Failed to update session with league ID');
                // But continue anyway since league was created
            }
            
            // Return the league data for the client to register with Lambda
            return {
                success: true,
                league: {
                    id: league.league_id.toString(),
                    name: league.league_name,
                    totalTeams: league.total_teams
                }
            };
            
        } catch (error) {
            console.error('Error creating league:', error);
            return fail(500, { error: 'Failed to create league' });
        }
    },
    
    deleteLeague: async ({ request, cookies }) => {
        const data = await request.formData();
        const leagueId = data.get('leagueId') as string;
        
        if (!leagueId) {
            return fail(400, { error: 'No league ID provided' });
        }
        
        try {
            const { error } = await supabaseScaling
                .from('leagues')
                .delete()
                .eq('league_id', leagueId);
                
            if (error) {
                console.error('Error deleting league:', error);
                return fail(500, { error: 'Failed to delete league' });
            }
            
            // Update session to remove league ID
            await updateSession(cookies, { leagueId: null });
            
            return { success: true };
            
        } catch (error) {
            console.error('Error in delete operation:', error);
            return fail(500, { error: 'Failed to delete league' });
        }
    }
};