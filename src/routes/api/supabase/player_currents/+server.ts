import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { isAuthenticated } from '$lib/server/auth';
import { getCurrentStats } from '$lib/server/currentStats';
import { getCurrentScores } from '$lib/server/currentScores';
import {
    getCachedStats, setCachedStats,
    getCachedScores, setCachedScores
} from '$lib/server/serverPlayerCache';

export const GET: RequestHandler = async ({ cookies, url }) => {
    if (!isAuthenticated(cookies)) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const playerId = url.searchParams.get('id');
        if (!playerId) {
            return json({ error: 'Player ID required' }, { status: 400 });
        }

        const leagueWeekParam = url.searchParams.get('league_week');
        if (!leagueWeekParam) {
            return json({ error: 'league_week required' }, { status: 400 });
        }
        const leagueWeek = Number(leagueWeekParam);
        if (!Number.isFinite(leagueWeek)) {
            return json({ error: 'league_week must be a number' }, { status: 400 });
        }

        let currentStats = await getCachedStats(playerId, leagueWeek);
        let currentScores = await getCachedScores(playerId, leagueWeek);

        const needStats = currentStats === undefined;
        const needScores = currentScores === undefined;

        if (needStats || needScores) {
            const [statsResult, scoresResult] = await Promise.allSettled([
                needStats ? getCurrentStats(playerId, leagueWeek) : Promise.resolve(currentStats),
                needScores ? getCurrentScores(playerId, leagueWeek) : Promise.resolve(currentScores)
            ]);

            if (statsResult.status === 'fulfilled') {
                currentStats = statsResult.value;
                if (needStats && currentStats !== undefined) {
                    await setCachedStats(playerId, leagueWeek, currentStats);
                }
            } else {
                console.error('current_player_stats fetch failed:', statsResult.reason);
            }

            if (scoresResult.status === 'fulfilled') {
                currentScores = scoresResult.value;
                if (needScores && currentScores !== undefined) {
                    await setCachedScores(playerId, leagueWeek, currentScores);
                }
            } else {
                console.error('current_player_scores fetch failed:', scoresResult.reason);
            }
        }

        return json({
            currentStats: currentStats ?? [],
            currentScores: currentScores ?? []
        });
    } catch (err) {
        console.error('Current stats/scores fetch error:', err);
        return json({ error: 'Failed to fetch current stats/scores' }, { status: 500 });
    }
};