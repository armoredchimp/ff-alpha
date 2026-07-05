// Full-state rehydration for the client's syncFullState. Returns the display
// teams (with current budgets derived from the pick log), all real picks, the
// order, and the current position. Only reports inProgress for a live draft.

import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getLeagueId } from '$lib/server/auth';
import { supabaseScaling } from '$lib/client/supabase/supaClient';
import { reconstructState, STARTING_BUDGET } from '$lib/server/draftEngine';

export const GET: RequestHandler = async ({ cookies }) => {
    const leagueId = getLeagueId(cookies);
    if (!leagueId) return json({ inProgress: false });

    const { data: ds } = await supabaseScaling
        .from('draft_state')
        .select('draft_order, status')
        .eq('league_id', leagueId)
        .maybeSingle();
    if (!ds || ds.status !== 'in_progress') return json({ inProgress: false });

    const order = ds.draft_order;

    const [teamsRes, picksRes] = await Promise.all([
        supabaseScaling.from('teams')
            .select('team_id, frontend_number, team_name, traits, formation, rivals, manager_id, transfer_budget')
            .eq('league_id', leagueId),
        supabaseScaling.from('draft_picks').select('*').eq('league_id', leagueId)
    ]);

    const teamsData = teamsRes.data ?? [];
    const picks = picksRes.data ?? [];

    // reconstruct for current (mid-draft) budgets — teams.transfer_budget still
    // holds the starting value until finalize, so it can't be trusted here.
    const state = reconstructState(picks, teamsData, order);

    const teams = teamsData.map(t => {
        const ts = state.teamState.get(t.team_id);
        return {
            teamId: t.team_id,
            frontendNumber: t.frontend_number,
            name: t.team_name,
            traits: t.traits ?? [],
            formation: t.formation,
            rivals: t.rivals ?? [],
            manager: t.manager_id ?? null,   // client resolves id -> manager object
            budget: ts ? ts.budget : STARTING_BUDGET
        };
    });

    const picksOut = picks
        .filter(p => p.player_id != null)   // real picks only; skips are invisible to the client
        .map(p => ({ teamId: p.team_id, playerId: p.player_id, position: p.position }));

    return json({
        inProgress: true,
        teams,
        picks: picksOut,
        order,
        overallDone: state.overallDone
    });
};