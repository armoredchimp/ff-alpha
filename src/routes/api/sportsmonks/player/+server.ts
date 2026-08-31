import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { isAuthenticated } from '$lib/server/auth';
import { sportsmonksGet } from '$lib/server/sportsmonks';
import { getCachedPlayer, setCachedPlayer } from '$lib/server/serverPlayerCache';

export const GET: RequestHandler = async ({ cookies, url }) => {
    if (!isAuthenticated(cookies)) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const playerId = url.searchParams.get('id');
        if (!playerId) {
            return json({ error: 'Player ID required' }, { status: 400 });
        }

        const cached = await getCachedPlayer(playerId);
        if (cached) {
            return json({ data: cached });
        }

        const include = url.searchParams.get('include');
        const params: Record<string, string> = {};
        if (include) {
            params.include = include;
        }

        const data = await sportsmonksGet(`/players/${playerId}`, params);
        if (data?.data) {
            await setCachedPlayer(playerId, data.data);
        }
        return json(data);
    } catch (err) {
        console.error('SportMonks player fetch error:', err);
        return json({ error: 'Failed to fetch player data' }, { status: 500 });
    }
};