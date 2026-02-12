import type { PageServerLoad } from './$types';
import { isAuthenticated } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';
import { sportsmonksGet } from '$lib/server/sportsmonks';

export const load: PageServerLoad = async ({ params, cookies }) => {
    if (!isAuthenticated(cookies)) {
        throw redirect(302, '/');
    }

    try {
        const data = await sportsmonksGet(`/players/${params.id}`, {
            include: 'statistics'
        });

        return {
            player: data.data
        };
    } catch (err) {
        console.error('Error loading player:', err);
        return {
            player: null,
            error: 'Failed to load player data'
        };
    }
};