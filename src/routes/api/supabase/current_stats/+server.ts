import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { isAuthenticated } from '$lib/server/auth';
import { playerCache } from '$lib/server/playerCache';
import { getCurrentStats } from '$lib/server/currentStats';

export const GET: RequestHandler = async ({ cookies, url }) => {
    if (!isAuthenticated(cookies)) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const playerId = url.searchParams.get('id');
        if (!playerId) {
            return json({ error: 'Player ID required' }, { status: 400 });
        }

        const cached = playerCache[playerId];
        if (cached?.currentStats) {
            return json({ currentStats: cached.currentStats });
        }

        const currentStats = await getCurrentStats(playerId);

        playerCache[playerId] = {
            ...playerCache[playerId],
            player: playerCache[playerId]?.player ?? null,
            fantasyStats: playerCache[playerId]?.fantasyStats ?? null,
            currentStats
        };

        return json({ currentStats });
    } catch (err) {
        console.error('Current stats fetch error:', err);
        return json({ error: 'Failed to fetch current stats' }, { status: 500 });
    }
};