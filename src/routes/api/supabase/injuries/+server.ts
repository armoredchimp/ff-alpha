import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { isAuthenticated } from '$lib/server/auth';
import { supabase } from "$lib/client/supabase/supaClient";


export const GET: RequestHandler = async ({ cookies, url }) => {
    if (!isAuthenticated(cookies)) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { data: injuries, error } = await supabase
            .from('injuries')
            .select('*');
        if (error) {
            console.error('Error loading injuries:', error);
            return json({ error: 'Failed to load injuries' }, { status: 500 });
        }

        return json({ injuries: injuries || [] });
       
    } catch (err) {
        console.error('Fantasy stats fetch error:', err);
        return json({ error: 'Failed to fetch fantasy stats' }, { status: 500 });
    }
};