import { leagueClientFor } from "$lib/server/supaClient";
import type { RequestHandler } from "@sveltejs/kit";
import { getIdToken } from '$lib/server/auth';
import { json } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ cookies, url }) => {
    const idToken = getIdToken(cookies);
    if (!idToken) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scaling = leagueClientFor(idToken);

    const weekParam = url.searchParams.get('league_week');
    if (!weekParam) {
        return json({ error: 'league_week is required' }, { status: 400 });
    }

    const league_week = parseInt(weekParam, 10);
    if (!Number.isFinite(league_week)) {
        return json({ error: 'league_week must be a number' }, { status: 400 });
    }

    try {
        const { data: results, error } = await scaling
            .from('match_results')
            .select('*')
            .eq('league_week', league_week);

        if (error) {
            console.error('Error loading match results:', error);
            return json({ error: 'Failed to load match results' }, { status: 500 });
        }

        if (results && results.length > 0) {
            return json({ results }, { status: 200 });
        }

        // Nothing for the current week yet — fall back one week.
        const { data: prior, error: priorError } = await scaling
            .from('match_results')
            .select('*')
            .eq('league_week', league_week - 1);

        if (priorError) {
            console.error('Error loading prior week results:', priorError);
            return json({ error: 'Failed to load match results' }, { status: 500 });
        }

        return json({ results: prior ?? [] }, { status: 200 });

    } catch (err) {
        console.error('Unexpected error loading match results:', err);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};