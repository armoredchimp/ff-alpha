import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getIdToken } from '$lib/server/auth';
import { leagueClientFor } from '$lib/server/supaClient';

export const GET: RequestHandler = async ({ cookies }) => {
    const idToken = getIdToken(cookies);
    if (!idToken) {
        return json({ error: 'No token in session' }, { status: 401 });
    }

    const client = leagueClientFor(idToken);

        const { data, error } = await client.rpc('debug_claims');

    return json({ data, error });
};