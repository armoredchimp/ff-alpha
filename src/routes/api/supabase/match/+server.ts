import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import { getIdToken } from "$lib/server/auth";
import { leagueClientFor } from "$lib/server/supaClient";

export const GET: RequestHandler = async ({ cookies, url }) => {
    const idToken = getIdToken(cookies);
    if (!idToken) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const matchId = url.searchParams.get('match_id');

    if (!matchId) {
        return json({ error: 'match_id is required' }, { status: 400 });
    }

    const { data, error } = await leagueClientFor(idToken)
        .from('match_details')
        .select('*')
        .eq('match_id', matchId)
        .single();

    if (error) {
        console.error('Error fetching match details:', error);
        return json({ error: 'Failed to fetch match details' }, { status: 500 });
    }

    return json({ matchDetails: data });
};