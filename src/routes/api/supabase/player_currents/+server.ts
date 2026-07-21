import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { isAuthenticated } from '$lib/server/auth';
import { serverPlayerCache } from '$lib/server/serverPlayerCache';
import { getCurrentStats } from '$lib/server/currentStats';
import { getCurrentScores } from '$lib/server/currentScores';

export const GET: RequestHandler = async ({ cookies, url }) => {
    if (!isAuthenticated(cookies)) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const playerId = url.searchParams.get('id');
        if (!playerId) {
            return json({ error: 'Player ID required' }, { status: 400 });
        }

        const cached = serverPlayerCache[playerId];

        if (cached?.currentStats && cached?.currentScores) {
            return json({
                currentStats: cached.currentStats,
                currentScores: cached.currentScores
            });
        }

        const [statsResult, scoresResult] = await Promise.allSettled([
            getCurrentStats(playerId),
            getCurrentScores(playerId)
        ]);

        if (statsResult.status === 'rejected') {
            console.error('current_week_stats fetch failed:', statsResult.reason);
        }
        if (scoresResult.status === 'rejected') {
            console.error('current_week_scores fetch failed:', scoresResult.reason);
        }

        // only overwrite a field on success; keep prior cached value if a fetch failed
        const currentStats =
            statsResult.status === 'fulfilled' ? statsResult.value : cached?.currentStats;
        const currentScores =
            scoresResult.status === 'fulfilled' ? scoresResult.value : cached?.currentScores;

        serverPlayerCache[playerId] = {
            ...serverPlayerCache[playerId],
            player: serverPlayerCache[playerId]?.player ?? null,
            fantasyStats: serverPlayerCache[playerId]?.fantasyStats ?? null,
            currentStats,
            currentScores
        };

        return json({
            currentStats: currentStats ?? [],
            currentScores: currentScores ?? []
        });
    } catch (err) {
        console.error('Current stats/scores fetch error:', err);
        return json({ error: 'Failed to fetch current stats/scores' }, { status: 500 });
    }
};