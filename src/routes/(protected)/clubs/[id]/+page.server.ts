import type { PageServerLoad } from './$types';
import { isAuthenticated } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';
import { sportsmonksGet } from '$lib/server/sportsmonks';

export const load: PageServerLoad = async ({ params, cookies }) => {
    if (!isAuthenticated(cookies)) {
        throw redirect(302, '/');
    }

    const id = params.id;
    let team = null;
    let error = null;

    try {
        const data = await sportsmonksGet(`/teams/${id}`, {
            include: 'statistics.details.type;latest.scores;upcoming'
        });
        team = data.data;
    } catch (err) {
        console.error('Error loading team:', err);
        error = 'Failed to load club data';
    }

    // latest comes back newest-first; upcoming soonest-first.
    const recentMatches = (team?.latest ?? []).slice(0, 3);
    const upcomingMatches = (team?.upcoming ?? []).slice(0, 3);

    return {
        team,
        recentMatches,
        upcomingMatches,
        error
    };
};