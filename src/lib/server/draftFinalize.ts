// Called by /pick and /advance when termination hits.

import { supabaseScaling } from '$lib/client/supabase/supaClient';
import { buildTeamPlayersRows, buildTeamBudgetUpdates, type DraftState } from '$lib/server/draftEngine';

export async function finalizeDraft(leagueId: string, state: DraftState) {
    const teamPlayersRows = buildTeamPlayersRows(leagueId, state);
    const budgetUpdates = buildTeamBudgetUpdates(state);

    // team_players: fresh write (positional arrays; empty lineup — AI lineups
    // are set later by the matchweek picker, the human sets theirs on the team page)
    await supabaseScaling.from('team_players').delete().eq('league_id', leagueId);
    const { error: tpErr } = await supabaseScaling.from('team_players').insert(teamPlayersRows);
    if (tpErr) throw new Error(`team_players write failed: ${tpErr.message}`);

    // server-derived final budgets + counts
    for (const u of budgetUpdates) {
        const { error } = await supabaseScaling
            .from('teams')
            .update({ transfer_budget: u.transfer_budget, player_count: u.player_count })
            .eq('team_id', u.team_id);
        if (error) console.error(`[finalize] budget update team ${u.team_id}: ${error.message}`);
    }

    // mark complete
    await supabaseScaling.from('draft_state').update({ status: 'complete' }).eq('league_id', leagueId);
    await supabaseScaling.from('leagues').update({ draft_complete: true }).eq('league_id', leagueId);
}