import type { PageServerLoad } from './$types';
import { isAuthenticated, getLeagueId } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';
import { sportsmonksGet } from '$lib/server/sportsmonks';
import { getFantasyStats } from '$lib/server/fantasyStats';
import { getCurrentStats } from '$lib/server/currentStats';
import { getCurrentScores } from '$lib/server/currentScores';
import { getLeagueWeekForLeague } from '$lib/server/leagueWeek';
import { serverPlayerCache } from '$lib/server/serverPlayerCache';

export const load: PageServerLoad = async ({ params, cookies }) => {
    if (!isAuthenticated(cookies)) {
        throw redirect(302, '/');
    }

    const id = params.id;
    const cached = serverPlayerCache[id];

    // Serve from cache only when everything the page needs is present.
    if (cached?.player && cached?.currentStats !== undefined && cached?.currentScores !== undefined) {
        console.log('player found on player cache');
        return {
            player: cached.player,
            fantasyStats: cached.fantasyStats,
            currentStats: cached.currentStats,
            currentScores: cached.currentScores,
            error: null
        };
    }

    let player = cached?.player ?? null;
    let fantasyStats = cached?.fantasyStats ?? null;
    let currentStats = cached?.currentStats;
    let currentScores = cached?.currentScores;
    let error = null;

    if (!player) {
        try {
            const data = await sportsmonksGet(`/players/${id}`, {
                include: 'statistics.details.type'
            });
            player = data.data;
        } catch (err) {
            console.error('Error loading player:', err);
            error = 'Failed to load player data';
        }
    }

    if (fantasyStats == null) {
        try {
            const leagueId = getLeagueId(cookies);
            if (leagueId) {
                fantasyStats = await getFantasyStats(leagueId, id);
            }
        } catch (err) {
            console.error('Error loading fantasy stats:', err);
        }
    }

    if (currentStats === undefined || currentScores === undefined) {
        // Current-week reads need the league's current league_week. Computed
        // server-side from the cookie-derived league (client leagueState isn't
        // reachable here). If it can't be resolved, skip the current reads
        // rather than returning a whole season of rows.
        const leagueId = getLeagueId(cookies);
        const leagueWeek = leagueId != null ? await getLeagueWeekForLeague(leagueId) : null;

        if (leagueWeek != null) {
            const [statsResult, scoresResult] = await Promise.allSettled([
                getCurrentStats(id, leagueWeek),
                getCurrentScores(id, leagueWeek)
            ]);
            if (statsResult.status === 'fulfilled') currentStats = statsResult.value;
            else console.error('current_player_stats load failed:', statsResult.reason);
            if (scoresResult.status === 'fulfilled') currentScores = scoresResult.value;
            else console.error('current_player_scores load failed:', scoresResult.reason);
        } else {
            console.error('Could not resolve league_week; skipping current reads');
        }
    }

    if (player) {
        serverPlayerCache[id] = {
            ...serverPlayerCache[id],
            player,
            fantasyStats,
            currentStats,
            currentScores
        };
    }

    return {
        player,
        fantasyStats,
        currentStats: currentStats ?? [],
        currentScores: currentScores ?? [],
        error
    };
};