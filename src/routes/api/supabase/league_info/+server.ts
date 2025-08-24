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
            .select('total_teams, draft_complete, countries_code')
            .eq('league_id', leagueId)
            .single();
       
        if (error) {
            console.error('Error fetching league info:', error);
            return json({ error: 'Failed to fetch league info' }, { status: 500 });
        }
       
        if (!league) {
            return json({ error: 'League not found' }, { status: 404 });
        }
       
        return json({
            draftComplete: league.draft_complete,
            numOfTeams: league.total_teams,
            countriesCode: league.countries_code,
            redirect: league.draft_complete ? '/teams/player/main' : '/draft'
        });
       
    } catch (error) {
        console.error('Error in league-info endpoint:', error);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};