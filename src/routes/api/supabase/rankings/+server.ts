import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { isAuthenticated } from '$lib/server/auth';
import { supabase } from '$lib/client/supabase/supaClient';

// Not tested yet but should work

export const GET: RequestHandler = async ({ cookies, url }) => {
    if (!isAuthenticated(cookies)) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = url.searchParams.get('id');
    const leaguePrefix = url.searchParams.get('leaguePrefix');

    if (!id || !leaguePrefix) {
        return json({ error: 'Missing id or leaguePrefix' }, { status: 400 });
    }

    try {
        const { data, error } = await supabase
            .from(`${leaguePrefix}_stats_2425_rankings`)
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Supabase error:', error);
            return json({ error: 'Failed to load rankings' }, { status: 500 });
        }

        return json({ rankings: data });
    } catch (err) {
        console.error('Rankings fetch error:', err);
        return json({ error: 'Failed to fetch rankings' }, { status: 500 });
    }
};