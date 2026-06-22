import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { isAuthenticated } from '$lib/server/auth';
import { supabase } from "$lib/client/supabase/supaClient";

export const GET: RequestHandler = async ({ cookies }) => {
    if (!isAuthenticated(cookies)) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        // All clubs, all leagues — small reference set, loaded once.
        const { data: clubs, error } = await supabase
            .from('clubs')
            .select('team_id, name');

        if (error) {
            console.error('Error loading clubs:', error);
            return json({ error: 'Failed to load clubs' }, { status: 500 });
        }
        return json({ clubs: clubs || [] });
    } catch (err) {
        console.error('Clubs fetch error:', err);
        return json({ error: 'Failed to fetch clubs' }, { status: 500 });
    }
};