import { playerTeam } from '$lib/stores/teams.svelte';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
    console.log('[player last] matchId:', playerTeam?.lastResult?.matchId);

    if (!playerTeam?.lastResult?.matchId) {
        return { team: playerTeam, matchDetails: null };
    }

    try {
        const res = await fetch(`/api/supabase/match?match_id=${playerTeam.lastResult.matchId}`);
        const result = await res.json();
        console.log('[player last] API response:', result);
        return { team: playerTeam, matchDetails: result.matchDetails || null };
    } catch (e) {
        console.error('[player last] Failed to fetch:', e);
        return { team: playerTeam, matchDetails: null };
    }
};