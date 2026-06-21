import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { isAuthenticated } from '$lib/server/auth';
import { supabase } from "$lib/client/supabase/supaClient";

export const GET: RequestHandler = async ({ cookies }) => {
    if (!isAuthenticated(cookies)) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        // upcoming_fixtures only ever holds the current gameweek window
        // (the job clears + repopulates weekly), so no date filter needed.
        const { data: fixtures, error } = await supabase
            .from('upcoming_fixtures')
            .select('player_id, fixture_id, team_id, opponent_team_id, is_home, kickoff');

        if (error) {
            console.error('Error loading upcoming fixtures:', error);
            return json({ error: 'Failed to load upcoming fixtures' }, { status: 500 });
        }
        return json({ fixtures: fixtures || [] });
    } catch (err) {
        console.error('Upcoming fixtures fetch error:', err);
        return json({ error: 'Failed to fetch upcoming fixtures' }, { status: 500 });
    }
};