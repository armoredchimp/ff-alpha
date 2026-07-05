// Validation (atomic — any failure rejects the whole write):
//   1. resolve the requester's team (ignores client-supplied team_id)
//   2. load that team's stored roster from the DB
//   3. every selected/subs/unused id must be in the stored roster
//   4. formation must be a real formationConfig key
//   5. favored must reference owned players + real current fixtures
// ============================================================

import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { supabaseScaling } from '$lib/client/supabase/supaClient';
import {
    resolveRequesterTeam,
    loadStoredRoster,
    assertIdsSubset,
    flattenSelected,
    isValidFormation,
    validateFavored
} from '$lib/server/validation';

export const POST: RequestHandler = async (event) => {
    const { request } = event;

    // ---- 1. resolve the requester's own team (identity choke point) ----
    const teamRes = await resolveRequesterTeam(event);
    if (!teamRes.ok) return json({ error: teamRes.error }, { status: teamRes.status });
    const teamId = teamRes.value;

    let payload: any;
    try {
        const formData = await request.formData();
        const raw = formData.get('teamPlayers') as string;
        payload = JSON.parse(raw);
    } catch {
        return json({ error: 'Invalid payload' }, { status: 400 });
    }

    const tp = Array.isArray(payload) ? payload[0] : payload;
    if (tp == null) {
        return json({ error: 'Empty payload' }, { status: 400 });
    }
    if (tp.team_id != null && Number(tp.team_id) !== Number(teamId)) {
        return json({ error: 'You may only edit your own team' }, { status: 403 });
    }

    const formation = tp.formation;
    const selected = tp.selected ?? {};
    const subs = tp.subs ?? [];
    const unused = tp.unused ?? [];
    const favored = tp.favored ?? {};

    // ---- 2. load the stored roster (source of truth) ----
    const rosterRes = await loadStoredRoster(teamId);
    if (!rosterRes.ok) return json({ error: rosterRes.error }, { status: rosterRes.status });
    const roster = rosterRes.value;

    // ---- 3. every submitted lineup id must be in the stored roster ----
    const selectedIds = flattenSelected(selected);
    const subsIds = (subs ?? []).filter((x: any) => x != null).map(Number);
    const unusedIds = (unused ?? []).filter((x: any) => x != null).map(Number);

    for (const [ids, label] of [
        [selectedIds, 'selected'],
        [subsIds, 'subs'],
        [unusedIds, 'unused']
    ] as Array<[number[], string]>) {
        const err = assertIdsSubset(ids, roster.all, label);
        if (err) return json({ error: err.error }, { status: err.status });
    }

    // ---- 4. formation must be valid (only if the client is setting one) ----
    if (formation !== undefined && !isValidFormation(formation)) {
        return json({ error: `Invalid formation: ${formation}` }, { status: 400 });
    }

    // ---- 5. favored must reference owned players + real current fixtures ----
    const favoredErr = await validateFavored(favored, roster);
    if (favoredErr) return json({ error: favoredErr.error }, { status: favoredErr.status });


    const updateFields: any = { selected, subs, unused, favored };

    const { error: updateErr } = await supabaseScaling
        .from('team_players')
        .update(updateFields)
        .eq('team_id', teamId);

    if (updateErr) {
        console.error('[player_upload] update failed:', updateErr.message);
        return json({ error: 'Failed to save lineup' }, { status: 500 });
    }

    // formation lives on the teams table — update it there if provided
    if (formation !== undefined) {
        const { error: fErr } = await supabaseScaling
            .from('teams')
            .update({ formation })
            .eq('team_id', teamId);
        if (fErr) {
            console.error('[player_upload] formation update failed:', fErr.message);
            return json({ error: 'Failed to save formation' }, { status: 500 });
        }
    }

    return json({ success: true, message: 'Lineup saved' });
};