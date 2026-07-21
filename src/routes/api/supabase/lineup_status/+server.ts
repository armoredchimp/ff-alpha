import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getLeagueId } from '$lib/server/auth';
import { supabaseScaling } from '$lib/client/supabase/supaClient';
 
export const GET: RequestHandler = async ({ cookies }) => {
    const leagueId = getLeagueId(cookies);
    if (!leagueId) return json({ noTeam: true });
 
    const { data, error } = await supabaseScaling
        .from('teams')
        .select('home')
        .eq('league_id', leagueId)
        .eq('frontend_number', 0)
        .maybeSingle();
 
    if (error || !data) return json({ noTeam: true });
    return json({ home: data.home === true });
};
 
