import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { isAuthenticated } from '$lib/server/auth';
import { supabase } from '$lib/server/supaClient';

// Scores for a set of players for a given league_week — feeds the locked-player
// hover popup. Player ids + week come from the client (the locked roster it
// already knows). Grouped by player_id server-side.
export const GET: RequestHandler = async ({ cookies, url }) => {
    if (!isAuthenticated(cookies)) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const idsParam = url.searchParams.get('player_ids');
        const weekParam = url.searchParams.get('league_week');

        if (!idsParam) {
            return json({ error: 'player_ids required' }, { status: 400 });
        }
        if (!weekParam) {
            return json({ error: 'league_week required' }, { status: 400 });
        }

        const playerIds = idsParam
            .split(',')
            .map((s) => Number(s))
            .filter((n) => Number.isFinite(n));
        const leagueWeek = Number(weekParam);

        if (playerIds.length === 0) {
            return json({ scores: {} });
        }

        const { data, error } = await supabase
            .from('current_player_scores')
            .select('*')
            .in('player_id', playerIds)
            .eq('league_week', leagueWeek);

        if (error) {
            console.error('Error fetching locked player scores:', error);
            return json({ error: 'Failed to load locked player scores' }, { status: 500 });
        }

        // Group by player_id (1-2 rows each).
        const byPlayer: Record<number, any[]> = {};
        for (const row of data ?? []) {
            (byPlayer[row.player_id] ??= []).push(row);
        }

        return json({ scores: byPlayer });
    } catch (err) {
        console.error('Locked player scores fetch error:', err);
        return json({ error: 'Failed to fetch locked player scores' }, { status: 500 });
    }
};