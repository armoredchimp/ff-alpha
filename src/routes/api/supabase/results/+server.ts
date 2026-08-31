import { supabaseScaling } from "$lib/server/supaClient";
import type { RequestHandler } from "@sveltejs/kit";
import { isAuthenticated, getLeagueId } from '$lib/server/auth';
import { json } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ cookies, url }) => {
    // Check authentication
    if (!isAuthenticated(cookies)) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    let league_week = 0;

    try {
        const leagueId = getLeagueId(cookies)
        let league_weekCode = url.searchParams.get('league_week');
        if (league_weekCode) {
            league_week = parseInt(league_weekCode)
            console.log('League week:', league_week)
        } else {
            console.warn('Failed to get matchweek from frontend', league_week)
        }
        try {
            const { data: results, error } = await supabaseScaling
                .from('match_results')
                .select('*')
                .eq('league_id', leagueId)
                .eq('league_week', league_week)


            if (error) {
                console.log(`Error loading match results with current league week:`, error);
            }
            if (!results || results.length === 0) {
                league_week = league_week - 1
                const { data: results, error } = await supabaseScaling
                    .from('match_results')
                    .select('*')
                    .eq('league_id', leagueId)
                    .eq('league_week', league_week)

                if (error) {
                    return json({ error: 'Failed to load match results with league week -1' }, { status: 500 });
                }
                return json({ results }, { status: 200 });
            }

        } catch (error) {
            console.error('Error retrieving match results after succesfully obtaining league week', error)
        }




    } catch (err) {
        console.error('Unexpected error loading match results:', err);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
}