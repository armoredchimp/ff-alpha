import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getIdToken } from '$lib/server/auth';
import { supabaseScaling, leagueClientFor } from '$lib/server/supaClient';

export const POST: RequestHandler = async ({ cookies, request }) => {
    const idToken = getIdToken(cookies);
    if (!idToken) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const assignments = body?.assignments;

    if (!Array.isArray(assignments) || assignments.length === 0) {
        return json({ error: 'assignments required' }, { status: 400 });
    }

    // Only teams the caller can actually see (RLS scopes to their league).
    const { data: ownTeams, error: readErr } = await leagueClientFor(idToken)
        .from('teams')
        .select('team_id');

    if (readErr) {
        console.error('manager_reassign: team read failed', readErr);
        return json({ error: 'Failed to verify teams' }, { status: 500 });
    }

    const allowed = new Set((ownTeams ?? []).map((t) => t.team_id));
    const valid = assignments.filter(
        (a) => allowed.has(a.teamId) && Number.isFinite(a.managerId)
    );

    if (valid.length === 0) {
        return json({ error: 'No valid assignments' }, { status: 403 });
    }

    // Writes go through the service key — no write policies yet.
    for (const a of valid) {
        const { error } = await supabaseScaling
            .from('teams')
            .update({ manager_id: a.managerId })
            .eq('team_id', a.teamId);

        if (error) {
            console.error(`manager_reassign: team ${a.teamId} failed`, error);
        }
    }

    return json({ success: true, updated: valid.length });
};