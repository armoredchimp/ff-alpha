import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import { isAuthenticated } from "$lib/server/auth";
import { supabaseScaling } from "$lib/client/supabase/supaClient";

export const GET: RequestHandler = async ({ cookies, url }) => {
      if (!isAuthenticated(cookies)) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const matchId = url.searchParams.get('match_id');
    
    if (!matchId) {
        return json({ error: 'match_id is required' }, { status: 400 });
    }

    const { data, error } = await supabaseScaling
        .from('match_details')
        .select('goal_details')
        .eq('match_id', matchId)
        .single();

    if (error) {
        console.error('Error fetching match details:', error);
        return json({ error: 'Failed to fetch match details' }, { status: 500 });
    }

    return json({ matchDetails: data });
};