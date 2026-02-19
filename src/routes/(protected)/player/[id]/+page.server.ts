import type { PageServerLoad } from './$types';
import { isAuthenticated, getLeagueId } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';
import { sportsmonksGet } from '$lib/server/sportsmonks';
import { getFantasyStats } from '$lib/server/supabase';
import { playerCache } from '$lib/server/playerCache';

export const load: PageServerLoad = async ({ params, cookies }) => {
    if (!isAuthenticated(cookies)) {
        throw redirect(302, '/');
    }

    const id = params.id;

    if (playerCache[id]) {
        console.log(`player found on player cache`)
        return {
            player: playerCache[id].player,
            fantasyStats: playerCache[id].fantasyStats,
            error: null
        };
    }

    let player = null;
    let fantasyStats = null;
    let error = null;

    try {
        const data = await sportsmonksGet(`/players/${id}`, {
            include: 'statistics.details.type'
        });
        player = data.data;
    } catch (err) {
        console.error('Error loading player:', err);
        error = 'Failed to load player data';
    }

    try {
        const leagueId = getLeagueId(cookies);
        if (leagueId) {
            fantasyStats = await getFantasyStats(leagueId, id);
        }
    } catch (err) {
        console.error('Error loading fantasy stats:', err);
    }

    if (player) {
        playerCache[id] = { player, fantasyStats };
    }

    return { player, fantasyStats, error };
};