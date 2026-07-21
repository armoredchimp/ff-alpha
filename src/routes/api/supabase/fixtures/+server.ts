import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { isAuthenticated } from '$lib/server/auth';
import { supabase } from "$lib/client/supabase/supaClient";

export const GET: RequestHandler = async ({ cookies, url }) => {
    if (!isAuthenticated(cookies)) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const seasonId = url.searchParams.get('season_id');
        if (!seasonId) {
            return json({ error: 'season_id required' }, { status: 400 });
        }

        const { data: fixtures, error } = await supabase
            .from('fixtures')
            .select('*')
            .eq('season_id', seasonId);

        if (error) {
            console.error('Error loading fixtures:', error);
            return json({ error: 'Failed to load fixtures' }, { status: 500 });
        }
        return json({ fixtures: fixtures || [] });
    } catch (err) {
        console.error('Fixtures fetch error:', err);
        return json({ error: 'Failed to fetch fixtures' }, { status: 500 });
    }
};