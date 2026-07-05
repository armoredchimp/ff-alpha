// AI teams get a lazy initial lineup via populateLineup (hydrated from the
// cached pool). The human team's lineup stays empty — they set it on the team
// page. Called by /pick and /advance on termination.

import { supabaseScaling } from '$lib/client/supabase/supaClient';
import { buildTeamBudgetUpdates, type DraftState } from '$lib/server/draftEngine';
import { createFormationStructure, populateLineup, extractPlayerIds } from '$lib/utils';

// empty scores scaffold so resetScores/addPlayerScores (inside populateLineup)
// have a structure to write into; the values are irrelevant here — we only
// extract the resulting lineup.
function makeScores() {
    const cat = () => ({ finishing: 0, attacking: 0, possession: 0, passing: 0, defense: 0 });
    return {
        total: { finishing: 0, attacking: 0, possession: 0, passing: 0, defense: 0, keeping: 0 },
        attackers: cat(),
        midfielders: cat(),
        defenders: cat(),
        keeper: { passing: 0, keeping: 0 }
    };
}

function hydrate(ids: number[], playersById: Map<number, any>): any[] {
    return ids.map(id => playersById.get(id)).filter(Boolean);
}

// Build a team object shaped for populateLineup, then extract the lineup ids.
function lazyLineup(ts: any, playersById: Map<number, any>) {
    const team: any = {
        formation: ts.formation,
        attackers: hydrate(ts.attackers, playersById),
        midfielders: hydrate(ts.midfielders, playersById),
        defenders: hydrate(ts.defenders, playersById),
        keepers: hydrate(ts.keepers, playersById),
        selected: createFormationStructure(ts.formation),
        subs: [],
        unused: [],
        scores: makeScores()
    };
    populateLineup(team);
    return extractPlayerIds(team); // { selected, subs, unused } in id form
}

export async function finalizeDraft(leagueId: string, state: DraftState, pool: any[]) {
    const playersById = new Map<number, any>(pool.map(p => [p.id, p]));

    const teamPlayersRows: any[] = [];
    for (const ts of state.teamState.values()) {
        let selected: any = {};
        let subs: number[] = [];
        let unused: number[] = [];

        if (ts.frontend_number !== 0) {
            const light = lazyLineup(ts, playersById);
            selected = light.selected;
            subs = light.subs;
            unused = light.unused;
        }

        teamPlayersRows.push({
            league_id: leagueId,
            team_id: ts.team_id,
            attackers: ts.attackers,
            midfielders: ts.midfielders,
            defenders: ts.defenders,
            keepers: ts.keepers,
            selected,
            subs,
            unused,
            favored: {}
        });
    }

    // fresh write of team_players
    await supabaseScaling.from('team_players').delete().eq('league_id', leagueId);
    const { error: tpErr } = await supabaseScaling.from('team_players').insert(teamPlayersRows);
    if (tpErr) throw new Error(`team_players write failed: ${tpErr.message}`);

    // server-derived final budgets + counts
    for (const u of buildTeamBudgetUpdates(state)) {
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