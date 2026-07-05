// AI advance. mode 'single' runs one turn; mode 'skip' runs turns until the
// human's turn (or termination). Load state once, work in memory, batch-write.
// Broke/no-affordable turns record a sentinel skip row (player_id null) so the
// order position stays derivable from the pick log.

import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getLeagueId } from '$lib/server/auth';
import { supabaseScaling } from '$lib/client/supabase/supaClient';
import {
    loadPool, reconstructState, selectAiPick, checkTermination,
    buildPickRow, buildSkipRow, prefixForCountry
} from '$lib/server/draftEngine';
import { finalizeDraft } from '$lib/server/draftFinalize';

export const POST: RequestHandler = async ({ cookies, request }) => {
    const leagueId = getLeagueId(cookies);
    if (!leagueId) return json({ error: 'No league' }, { status: 401 });

    let mode: 'single' | 'skip' = 'single';
    try {
        const body = await request.json();
        if (body.mode === 'skip' || body.mode === 'single') mode = body.mode;
    } catch { /* default single */ }

    // draft_state (must be in progress); country folded in at start
    const { data: ds, error: dsErr } = await supabaseScaling
        .from('draft_state')
        .select('draft_order, status, countries_code')
        .eq('league_id', leagueId)
        .maybeSingle();
    if (dsErr || !ds) return json({ error: 'No draft state' }, { status: 404 });
    if (ds.status !== 'in_progress') return json({ error: 'Draft not in progress' }, { status: 409 });
    const order = ds.draft_order;

    const prefix = prefixForCountry(ds.countries_code);
    if (!prefix) return json({ error: 'Invalid league country' }, { status: 400 });

    // load state inputs once
    const [teamsRes, picksRes, pool] = await Promise.all([
        supabaseScaling.from('teams').select('team_id, formation, traits, frontend_number').eq('league_id', leagueId),
        supabaseScaling.from('draft_picks').select('*').eq('league_id', leagueId),
        loadPool(prefix)
    ]);

    const state = reconstructState(picksRes.data ?? [], teamsRes.data ?? [], order);

    // already terminal but unfinalized (defensive) — finalize now
    const initialTerm = checkTermination(state, pool, order);
    if (initialTerm.done) {
        await finalizeDraft(leagueId, state, pool);
        return json({ picks: [], overallDone: state.overallDone, done: true, reason: initialTerm.reason });
    }

    const pickRows: any[] = [];
    const skipRows: any[] = [];
    const deltaPicks: any[] = [];
    let done = false;
    let reason: string | undefined;

    // process one turn in memory; returns the outcome
    function processOneTurn(): 'picked' | 'skipped' | 'human' | 'exhausted' {
        const entry = order[state.overallDone];
        if (!entry) return 'exhausted';
        if (entry.frontendNumber === 0) return 'human';   // stop — never pick for the human

        const ts = state.teamState.get(entry.teamId);
        if (!ts) return 'human';   // unknown team — stop safely

        const result = selectAiPick(ts, pool, state.draftedSet);

        if ('player' in result) {
            const player = result.player;
            const row = buildPickRow(leagueId, entry, player);
            pickRows.push(row);
            deltaPicks.push({
                teamId: row.team_id, playerId: row.player_id, position: row.position,
                transferValue: row.transfer_value, round: row.round, pick: row.pick, overallPick: row.overall_pick
            });
            // mutate in-memory state so subsequent turns (and this team's later
            // picks) see the updated roster/budget/drafted set
            state.draftedSet.add(player.id);
            ts.budget -= player.transfer_value;
            ts.playerCount++;
            switch (player.position) {
                case 'Goalkeeper': ts.keepers.push(player.id); break;
                case 'Defender':   ts.defenders.push(player.id); break;
                case 'Midfielder': ts.midfielders.push(player.id); break;
                case 'Attacker':   ts.attackers.push(player.id); break;
            }
            state.overallDone++;
            return 'picked';
        }

        // broke or no affordable — record a skip, advance position only
        skipRows.push(buildSkipRow(leagueId, entry));
        state.overallDone++;
        return 'skipped';
    }

    // loop
    while (true) {
        const outcome = processOneTurn();
        if (outcome === 'exhausted' || outcome === 'human') break;

        const term = checkTermination(state, pool, order);
        if (term.done) { done = true; reason = term.reason; break; }

        if (mode === 'single') break;   // single: one turn only
    }

    // batch write all rows (unique overall_pick guards concurrent advances)
    const allRows = [...pickRows, ...skipRows];
    if (allRows.length > 0) {
        const { error: insErr } = await supabaseScaling.from('draft_picks').insert(allRows);
        if (insErr) {
            console.error('[advance] batch insert failed:', insErr.message);
            return json({ error: 'Advance conflict — refresh and retry' }, { status: 409 });
        }
    }

    if (done) {
        await finalizeDraft(leagueId, state, pool);
    } else {
        const nextEntry = order[state.overallDone] ?? null;
        if (nextEntry) {
            await supabaseScaling.from('draft_state')
                .update({ current_round: nextEntry.round, current_pick: nextEntry.pick })
                .eq('league_id', leagueId);
        }
    }

    return json({ picks: deltaPicks, overallDone: state.overallDone, done, reason });
};