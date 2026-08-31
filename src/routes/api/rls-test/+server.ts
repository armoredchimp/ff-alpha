import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getIdToken } from '$lib/server/auth';
import { refClientFor, leagueClientFor } from '$lib/server/supaClient';

export const GET: RequestHandler = async ({ cookies }) => {
    const idToken = getIdToken(cookies);
    if (!idToken) {
        return json({ error: 'No token in session' }, { status: 401 });
    }

    const client = leagueClientFor(idToken);
    const { data, error } = await client
        .from('teams')
        .select('*')
        .eq('league_id', '0bf31019-f1c1-4671-84bf-5363683b6613');

    return json({ data, error });
};