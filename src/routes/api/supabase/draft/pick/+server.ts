// routes/api/supabase/draft/pick/+server.ts
// Human pick: validate it's the human's turn, validate the chosen player
// against authoritative state, persist, check termination.

import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getLeagueId } from '$lib/server/auth';
import { supabaseScaling } from '$lib/client/supabase/supaClient';
import { resolveRequesterTeam } from '$lib/server/validation';
import {
    loadPool, reconstructState, validateHumanPick, checkTermination,
    buildPickRow, prefixForCountry
} from '$lib/server/draftEngine';
import { finalizeDraft } from '$lib/server/draftFinalize';

export const POST: RequestHandler = async (event) => {
    const { cookies, request } = event;
    const leagueId = getLeagueId(cookies);
    if (!leagueId) return json({ error: 'No league' }, { status: 401 });

    // requester's team (frontend_number 0)
    const teamRes = await resolveRequesterTeam(event);
    if (!teamRes.ok) return json({ error: teamRes.error }, { status: teamRes.status });
    const requesterTeamId = teamRes.value;

    let playerId: number;
    try {
        const body = await request.json();
        playerId = Number(body.playerId);
        if (!Number.isFinite(playerId)) throw new Error();
    } catch {
        return json({ error: 'Invalid playerId' }, { status: 400 });
    }

    // draft_state must be in progress
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

    // load state inputs (once)
    const [teamsRes, picksRes, pool] = await Promise.all([
        supabaseScaling.from('teams').select('team_id, formation, traits, frontend_number').eq('league_id', leagueId),
        supabaseScaling.from('draft_picks').select('*').eq('league_id', leagueId),
        loadPool(prefix)
    ]);

    const state = reconstructState(picksRes.data ?? [], teamsRes.data ?? [], order);

    // turn guard: must be the human's turn
    const entry = state.nextEntry;
    if (!entry) return json({ error: 'Draft is over' }, { status: 409 });
    if (entry.frontendNumber !== 0 || entry.teamId !== requesterTeamId) {
        return json({ error: 'Not your turn' }, { status: 409 });
    }

    // validate the chosen player
    const ts = state.teamState.get(requesterTeamId);
    if (!ts) return json({ error: 'Team state missing' }, { status: 500 });
    const check = validateHumanPick(playerId, ts, pool, state.draftedSet);
    if (!check.ok) return json({ error: check.error }, { status: 400 });

    // persist. unique(league_id, player_id) + unique(league_id, overall_pick)
    // guard against concurrent double-picks — a conflict means someone/something
    // already filled this slot or took this player.
    const row = buildPickRow(leagueId, entry, check.player);
    const { error: insErr } = await supabaseScaling.from('draft_picks').insert(row);
    if (insErr) return json({ error: 'Pick conflict — refresh and retry' }, { status: 409 });

    // update in-memory state to check termination without re-reading
    state.draftedSet.add(check.player.id);
    ts.budget -= check.player.transfer_value;
    ts.playerCount++;
    state.overallDone += 1;
    const nextEntry = order[state.overallDone] ?? null;

    const term = checkTermination(state, pool, order);

    if (term.done) {
        await finalizeDraft(leagueId, state);
    } else if (nextEntry) {
        await supabaseScaling.from('draft_state')
            .update({ current_round: nextEntry.round, current_pick: nextEntry.pick })
            .eq('league_id', leagueId);
    }

    return json({
        picks: [{
            teamId: row.team_id,
            playerId: row.player_id,
            position: row.position,
            transferValue: row.transfer_value,
            round: row.round,
            pick: row.pick,
            overallPick: row.overall_pick
        }],
        overallDone: state.overallDone,
        done: term.done,
        reason: term.reason
    });
};