import type { PageServerLoad } from './$types';
import { isAuthenticated, getLeagueId, getIdToken } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';
import { sportsmonksGet } from '$lib/server/sportsmonks';
import { getFantasyStats } from '$lib/server/fantasyStats';
import { getCurrentStats } from '$lib/server/currentStats';
import { getCurrentScores } from '$lib/server/currentScores';
import { getLeagueWeekForLeague } from '$lib/server/leagueWeek';
import { leagueClientFor } from '$lib/server/supaClient';
import {
    getCachedPlayer, setCachedPlayer,
    getCachedStats, setCachedStats,
    getCachedScores, setCachedScores
} from '$lib/server/serverPlayerCache';

export const load: PageServerLoad = async ({ params, cookies }) => {
    if (!isAuthenticated(cookies)) {
        throw redirect(302, '/');
    }

    const id = params.id;
    let error = null;

    // --- Sportmonks player: identical for every user, long TTL ---
    let player = await getCachedPlayer(id);

    if (!player) {
        try {
            const data = await sportsmonksGet(`/players/${id}`, {
                include: 'statistics.details.type'
            });
            player = data.data;
            if (player) await setCachedPlayer(id, player);
        } catch (err) {
            console.error('Error loading player:', err);
            error = 'Failed to load player data';
        }
    }

    const leagueId = getLeagueId(cookies);
    const idToken = getIdToken(cookies);
    let fantasyStats = null;
    let currentStats;
    let currentScores;

    if (leagueId) {
        // --- Fantasy stats: scoped by RLS to the user's league ---
        if (idToken) {
            try {
                fantasyStats = await getFantasyStats(leagueClientFor(idToken), id);
            } catch (err) {
                console.error('Error loading fantasy stats:', err);
            }
        }

        const leagueWeek = await getLeagueWeekForLeague(leagueId);

        if (leagueWeek != null) {
            // --- Stats and scores: generic per (player, week), short TTL ---
            currentStats = await getCachedStats(id, leagueWeek);
            currentScores = await getCachedScores(id, leagueWeek);

            const needStats = currentStats === undefined;
            const needScores = currentScores === undefined;

            if (needStats || needScores) {
                const [statsResult, scoresResult] = await Promise.allSettled([
                    needStats ? getCurrentStats(id, leagueWeek) : Promise.resolve(currentStats),
                    needScores ? getCurrentScores(id, leagueWeek) : Promise.resolve(currentScores)
                ]);

                if (statsResult.status === 'fulfilled') {
                    currentStats = statsResult.value;
                    if (needStats && currentStats !== undefined) {
                        await setCachedStats(id, leagueWeek, currentStats);
                    }
                } else {
                    console.error('current_player_stats load failed:', statsResult.reason);
                }

                if (scoresResult.status === 'fulfilled') {
                    currentScores = scoresResult.value;
                    if (needScores && currentScores !== undefined) {
                        await setCachedScores(id, leagueWeek, currentScores);
                    }
                } else {
                    console.error('current_player_scores load failed:', scoresResult.reason);
                }
            }
        } else {
            console.error('Could not resolve league_week; skipping current reads');
        }
    }

    return {
        player,
        fantasyStats,
        currentStats: currentStats ?? [],
        currentScores: currentScores ?? [],
        error
    };
};