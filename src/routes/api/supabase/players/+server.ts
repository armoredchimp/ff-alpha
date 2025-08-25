import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { supabase } from "$lib/supabase/supaClient";
import { isAuthenticated, getLeagueId } from '$lib/server/auth';
import { supabaseScaling } from "$lib/supabase/supaClient";
import { TABLE_PREFIXES } from '$lib/stores/league.svelte';


export const GET: RequestHandler = async ({ cookies, url }) => {
    // Check authentication
    if (!isAuthenticated(cookies)) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
        let countriesCode = -1;
        
        // First, try to get countries code from query parameter
        const paramCode = url.searchParams.get('countriesCode');
        if (paramCode) {
            countriesCode = parseInt(paramCode);
        } else {
            console.warn(`Invalid countries code ${countriesCode}`);
            return;
        }
        
        // Validate countries code
        if (!TABLE_PREFIXES[countriesCode]) {
            console.warn(`Invalid countries code ${countriesCode}`);
            return;
        }
        
        // Build the table name
        const season = '2425'; // You can make this dynamic later if needed
        const tableName = `${TABLE_PREFIXES[countriesCode]}_mini_${season}`;
        
        console.log(`Loading players from table: ${tableName} for countries code: ${countriesCode}`);
        
        // Load players from the appropriate mini table
        const { data: players, error } = await supabase
            .from(tableName)
            .select('*')
            .order('transfer_value', { ascending: false });
            
        if (error) {
            console.error(`Error loading players from ${tableName}:`, error);
            return json({ error: 'Failed to load players' }, { status: 500 });
        }
        
        return json({ 
            players: players || [],
            tableName: tableName,
            countriesCode: countriesCode
        });
    } catch (error) {
        console.error('Error in players endpoint:', error);
        return json({ error: 'Server error' }, { status: 500 });
    }
};