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
        // Load managers from active_managers table
        const { data: managers, error } = await supabase
            .from('active_managers')
            .select('*');
            
        if (error) {
            console.error('Error loading managers:', error);
            return json({ error: 'Failed to load managers' }, { status: 500 });
        }
        
        return json({ managers: managers || [] });
    } catch (error) {
        console.error('Error in managers endpoint:', error);
        return json({ error: 'Server error' }, { status: 500 });
    }
};