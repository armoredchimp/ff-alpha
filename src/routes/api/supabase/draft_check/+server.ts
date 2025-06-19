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
        
        const { data: league, error } = await supabaseScaling
            .from('leagues')
            .select('draft_complete')
            .eq('league_id', leagueId)
            .single();
        
        if (error) {
            console.error('Error checking league draft status:', error);
            return json({ error: 'Failed to check league status' }, { status: 500 });
        }
        
        if (!league) {
            return json({ error: 'League not found' }, { status: 404 });
        }
        
        return json({ 
            draftComplete: league.draft_complete,
            redirect: league.draft_complete ? '/teams/player/main' : '/draft'
        });
        
    } catch (error) {
        console.error('Error in check-draft endpoint:', error);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};