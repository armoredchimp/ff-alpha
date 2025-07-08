import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { supabase } from "$lib/supabase/supaClient";
import { isAuthenticated } from '$lib/server/auth';

export const GET: RequestHandler = async ({ cookies }) => {
    // Check authentication
    if (!isAuthenticated(cookies)) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
        // Load players from mini table
        const { data: players, error } = await supabase
            .from('prem_mini_2425')
            .select('*')
            .order('transfer_value', { ascending: false });
            
        if (error) {
            console.error('Error loading players:', error);
            return json({ error: 'Failed to load players' }, { status: 500 });
        }
        
        return json({ players: players || [] });
    } catch (error) {
        console.error('Error in players endpoint:', error);
        return json({ error: 'Server error' }, { status: 500 });
    }
};