import { teams } from '$lib/stores/teams.svelte';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
    console.log('[last] params.name:', params.name);

    let foundTeam = null;

    const entry = Object.entries(teams).find(
        ([_, teamData]) => teamData.name.toLowerCase() === params.name.toLowerCase()
    );
    foundTeam = entry ? entry[1] : null;
    

    console.log('[last] foundTeam:', foundTeam?.name, 'matchId:', foundTeam?.lastResult?.matchId);

    if (!foundTeam || !foundTeam.lastResult?.matchId) {
        console.log('[last] No team or no matchId, returning null');
        return { team: foundTeam, matchDetails: null };
    }

    try {
        const res = await fetch(`/api/supabase/match?match_id=${foundTeam.lastResult.matchId}`);
        const result = await res.json();
        console.log('[last] API response:', result);
        return { team: foundTeam, matchDetails: result.matchDetails || null };
    } catch (e) {
        console.error('[last] Failed to fetch match details:', e);
        return { team: foundTeam, matchDetails: null };
    }
};