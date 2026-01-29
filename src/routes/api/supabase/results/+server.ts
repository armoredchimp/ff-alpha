import { supabaseScaling } from "$lib/client/supabase/supaClient";
import type { RequestHandler } from "@sveltejs/kit";
import { isAuthenticated, getLeagueId } from '$lib/server/auth';
import { json } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ cookies, url }) => {
    // Check authentication
    if (!isAuthenticated(cookies)) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    let matchWeek = 0;

    try {
        const leagueId = getLeagueId(cookies)
        let matchWeekCode = url.searchParams.get('matchWeek');
        if (matchWeekCode) {
            matchWeek = parseInt(matchWeekCode)
        } else {
            console.warn('Failed to get matchweek from frontend', matchWeek)
        }
        const { data: results, error } = await supabaseScaling
            .from('match_results')
            .select('*')
            .eq('league_id', leagueId)
            .eq('gameweek', matchWeek)


        if (error) {
            console.error(`Error loading match results:`, error);
            return json({ error: 'Failed to load match results' }, { status: 500 });
        }

        if (!results || results.length === 0) {
            return json({ error: 'No results found for this league / match week' }, { status: 404 });
        }

        return json({ results }, { status: 200 });


    } catch (err) {
        console.error('Unexpected error loading match results:', err);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
}