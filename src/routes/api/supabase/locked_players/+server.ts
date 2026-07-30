import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { isAuthenticated } from '$lib/server/auth';
import { supabase } from '$lib/client/supabase/supaClient';

// Players whose real match has already kicked off — the client uses this to
// disable moving them out of their bucket. Global (a kickoff is league-agnostic),
// live (compared against now), no stored state.
export const GET: RequestHandler = async ({ cookies }) => {
    if (!isAuthenticated(cookies)) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const nowIso = new Date().toISOString();
        const { data, error } = await supabase
            .from('upcoming_fixtures')
            .select('player_id')
            .lte('kickoff', nowIso);

        if (error) {
            console.error('Error loading locked players:', error);
            return json({ error: 'Failed to load locked players' }, { status: 500 });
        }

        // Dedupe (a player can have 2 fixture rows) into a flat id list.
        const ids = Array.from(new Set((data ?? []).map((r) => r.player_id)));
        return json({ lockedPlayers: ids });
    } catch (err) {
        console.error('Locked players fetch error:', err);
        return json({ error: 'Failed to fetch locked players' }, { status: 500 });
    }
};