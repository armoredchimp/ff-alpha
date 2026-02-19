import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { isAuthenticated, getLeagueId } from '$lib/server/auth';
import { playerCache } from '$lib/server/playerCache';
import { getFantasyStats } from '$lib/server/supabase';

export const GET: RequestHandler = async ({ cookies, url }) => {
    if (!isAuthenticated(cookies)) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const playerId = url.searchParams.get('id');
        if (!playerId) {
            return json({ error: 'Player ID required' }, { status: 400 });
        }

        const leagueId = getLeagueId(cookies);
        if (!leagueId) {
            return json({ error: 'No league found' }, { status: 400 });
        }

        const fantasyStats = await getFantasyStats(leagueId, playerId);
        if (fantasyStats) {
            playerCache[playerId] = { ...playerCache[playerId], player: playerCache[playerId]?.player ?? null, fantasyStats };
        }
        return json({ fantasyStats });
    } catch (err) {
        console.error('Fantasy stats fetch error:', err);
        return json({ error: 'Failed to fetch fantasy stats' }, { status: 500 });
    }
};