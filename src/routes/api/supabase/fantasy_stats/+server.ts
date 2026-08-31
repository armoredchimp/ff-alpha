import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { isAuthenticated } from '$lib/server/auth';
import { getFantasyStats } from '$lib/server/fantasyStats';
import { getIdToken } from '$lib/server/auth';
import { leagueClientFor } from '$lib/server/supaClient';

export const GET: RequestHandler = async ({ cookies, url }) => {
    if (!isAuthenticated(cookies)) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const playerId = url.searchParams.get('id');
        if (!playerId) {
            return json({ error: 'Player ID required' }, { status: 400 });
        }

        const idToken = getIdToken(cookies);
        if (!idToken) {
            return json({ error: 'No valid session' }, { status: 401 });
        }

        const fantasyStats = await getFantasyStats(leagueClientFor(idToken), playerId);
        return json({ fantasyStats });
    } catch (err) {
        console.error('Fantasy stats fetch error:', err);
        return json({ error: 'Failed to fetch fantasy stats' }, { status: 500 });
    }
};