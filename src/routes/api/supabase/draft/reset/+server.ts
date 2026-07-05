// Explicit abandon of an in-progress draft. Clears teams/picks/state (teams
// cascade to team_players), leaving the leagues row intact so the league
// survives and /start can run fresh. Refuses to touch a completed draft.

import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getLeagueId } from '$lib/server/auth';
import { supabaseScaling } from '$lib/client/supabase/supaClient';

export const POST: RequestHandler = async ({ cookies }) => {
    const leagueId = getLeagueId(cookies);
    if (!leagueId) return json({ error: 'No league' }, { status: 401 });

    // a completed draft is a live league, not an abandon — don't wipe it here
    const { data: league, error: lErr } = await supabaseScaling
        .from('leagues')
        .select('draft_complete')
        .eq('league_id', leagueId)
        .single();
    if (lErr || !league) return json({ error: 'League not found' }, { status: 404 });
    if (league.draft_complete) {
        return json({ error: 'Cannot reset a completed draft' }, { status: 409 });
    }

    // clear picks, then state, then teams (teams cascade to team_players)
    const { error: picksErr } = await supabaseScaling
        .from('draft_picks').delete().eq('league_id', leagueId);
    if (picksErr) return json({ error: 'Failed to clear picks' }, { status: 500 });

    const { error: stateErr } = await supabaseScaling
        .from('draft_state').delete().eq('league_id', leagueId);
    if (stateErr) return json({ error: 'Failed to clear draft state' }, { status: 500 });

    const { error: teamsErr } = await supabaseScaling
        .from('teams').delete().eq('league_id', leagueId);
    if (teamsErr) return json({ error: 'Failed to clear teams' }, { status: 500 });

    return json({ success: true });
};