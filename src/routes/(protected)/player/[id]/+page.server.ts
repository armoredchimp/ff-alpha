import type { PageServerLoad } from './$types';
import { isAuthenticated, getLeagueId } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';
import { sportsmonksGet } from '$lib/server/sportsmonks';
import { getFantasyStats } from '$lib/server/supabase';

export const load: PageServerLoad = async ({ params, cookies }) => {
    if (!isAuthenticated(cookies)) {
        throw redirect(302, '/');
    }

    let player = null;
    let fantasyStats = null;
    let error = null;

    try {
        const data = await sportsmonksGet(`/players/${params.id}`, {
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
            fantasyStats = await getFantasyStats(leagueId, params.id);
        }
    } catch (err) {
        console.error('Error loading fantasy stats:', err);
    }

    return {
        player,
        fantasyStats,
        error
    };
};