import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { isAuthenticated } from '$lib/server/auth';
import { sportsmonksGet } from '$lib/server/sportsmonks';

export const GET: RequestHandler = async ({ cookies, url }) => {
    if (!isAuthenticated(cookies)) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const teamId = url.searchParams.get('id');
        if (!teamId) {
            return json({ error: 'Team ID required' }, { status: 400 });
        }

        const include = url.searchParams.get('include');
        const params: Record<string, string> = {};
        if (include) {
            params.include = include;
        }

        const data = await sportsmonksGet(`/teams/${teamId}`, params);
        return json(data);
    } catch (err) {
        console.error('SportMonks team fetch error:', err);
        return json({ error: 'Failed to fetch team data' }, { status: 500 });
    }
};