import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getIdToken } from '$lib/server/auth';
import { leagueClientFor } from '$lib/server/supaClient';

export const GET: RequestHandler = async ({ cookies }) => {
    const idToken = getIdToken(cookies);
    if (!idToken) return json({ noTeam: true });

    const { data, error } = await leagueClientFor(idToken)
        .from('teams')
        .select('home')
        .eq('frontend_number', 0)
        .maybeSingle();

    if (error || !data) return json({ noTeam: true });
    return json({ home: data.home === true });
};