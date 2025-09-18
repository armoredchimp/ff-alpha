import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { supabase } from "$lib/client/supabase/supaClient";
import { isAuthenticated } from '$lib/server/auth';
import { TABLE_PREFIXES } from '$lib/stores/league.svelte';

export const GET: RequestHandler = async ({ cookies, url }) => {
    // Check authentication
    if (!isAuthenticated(cookies)) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
        let countriesCode = 0;

        const paramCode = url.searchParams.get('countriesCode');
        if (paramCode) {
            countriesCode = parseInt(paramCode);
        } 

        // Validate countries code
        if (!TABLE_PREFIXES[countriesCode]) {
            console.warn(`Invalid countries code ${countriesCode}`);
            return;
        }

         // Build the table name
        const tableName = `${TABLE_PREFIXES[countriesCode]}_managers`;

        const { data: managers, error } = await supabase
            .from(tableName)
            .select('*');
            
        if (error) {
            console.error('Error loading managers:', error);
            return json({ error: 'Failed to load managers' }, { status: 500 });
        }
        
        return json({ 
            managers: managers || [],
            tableName: tableName,
            countriesCode: countriesCode
        });
    } catch (error) {
        console.error('Error in managers endpoint:', error);
        return json({ error: 'Server error' }, { status: 500 });
    }
};