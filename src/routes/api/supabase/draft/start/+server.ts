// Draft-start: hardened team creation + draft_state generation.


import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getLeagueId } from '$lib/server/auth';
import { supabaseScaling } from '$lib/client/supabase/supaClient';
import { STARTING_BUDGET, TOTAL_ROUNDS, generateDraftOrder } from '$lib/server/draftEngine';

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export const POST: RequestHandler = async ({ cookies, request }) => {
    const leagueId = getLeagueId(cookies);
    
    if (!leagueId) return json({ error: 'No league' }, { status: 401 });

    const { data: league } = await supabaseScaling
        .from('leagues').select('countries_code').eq('league_id', leagueId).single();

    if (!league) return json({ error: 'League not found' }, { status: 404 });

    // refuse to clobber a draft in progress — restart requires explicit reset
    const { data: existing } = await supabaseScaling
        .from('draft_state')
        .select('status')
        .eq('league_id', leagueId)
        .maybeSingle();
    if (existing?.status === 'in_progress') {
        return json({ error: 'Draft already in progress' }, { status: 409 });
    }

    // client sends team identities (names/traits/managers/rivals) — cosmetic
    let clientTeams: any[];
    try {
        const fd = await request.formData();
        clientTeams = JSON.parse(fd.get('teams') as string);
    } catch {
        return json({ error: 'Invalid payload' }, { status: 400 });
    }
    if (!Array.isArray(clientTeams) || clientTeams.length < 2) {
        return json({ error: 'Invalid teams' }, { status: 400 });
    }

    // exactly one human team (frontend_number 0)
    if (clientTeams.filter(t => t.frontend_number === 0).length !== 1) {
        return json({ error: 'Exactly one human team required' }, { status: 400 });
    }

    // server-assigned random draft order (permutation of 1..N)
    const n = clientTeams.length;
    const seeds = shuffle(Array.from({ length: n }, (_, i) => i + 1));

    const toInsert = clientTeams.map((t, i) => ({
        league_id: leagueId,               // from cookie, never client
        team_name: t.team_name,
        rivals: t.rivals ?? [],
        traits: t.traits ?? [],
        manager_id: t.manager_id ?? null,
        formation: t.formation || '4-4-2',
        frontend_number: t.frontend_number,
        transfer_budget: STARTING_BUDGET,  // server authority
        player_count: 0,
        draft_order: seeds[i]              // server random
    }));

    // fresh start: clear prior picks/state/teams (teams cascade to team_players)
    await supabaseScaling.from('draft_picks').delete().eq('league_id', leagueId);
    await supabaseScaling.from('draft_state').delete().eq('league_id', leagueId);
    await supabaseScaling.from('teams').delete().eq('league_id', leagueId);

    const { data: inserted, error: insErr } = await supabaseScaling
        .from('teams')
        .insert(toInsert)
        .select('team_id, frontend_number, draft_order');
    if (insErr || !inserted) {
        console.error('[draft/start] team insert failed:', insErr?.message);
        return json({ error: 'Failed to insert teams' }, { status: 500 });
    }

    const order = generateDraftOrder(inserted, TOTAL_ROUNDS);

    const { error: stateErr } = await supabaseScaling
        .from('draft_state')
        .insert({
            league_id: leagueId,
            current_round: 1,
            current_pick: 1,
            total_rounds: TOTAL_ROUNDS,
            draft_order: order,
            countries_code: league.countries_code,
            status: 'in_progress'
        });
    if (stateErr) {
        console.error('[draft/start] draft_state insert failed:', stateErr.message);
        return json({ error: 'Failed to create draft state' }, { status: 500 });
    }

    const teamIdMap: Record<string, number> = {};
    for (const t of inserted) teamIdMap[t.frontend_number] = t.team_id;

    return json({ success: true, teamIdMap, order });
};