// POST /api/supabase/next_matchups   body: { leagueId }
//
// Sets next_matchup + home on teams and team_players for ONE league, from that
// league's schedule at its current league_week.
//
// Ported from the admin job of the same name, scoped to a single league so it
// can be called at draft completion.
//
// NOTE: uses service-key clients for now. When RLS lands this should move to
// the user's session client and be restricted to leagues they belong to — the
// query shape doesn't change, only which client runs it.

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase, supabaseScaling } from '$lib/client/supabase/supaClient';

export const POST: RequestHandler = async ({ request }) => {
    const body = await request.json().catch(() => null);
    const leagueId = body?.leagueId;
    if (!leagueId) throw error(400, 'leagueId required');

    // ---- league + schedule ----
    const { data: league, error: leagueErr } = await supabaseScaling
        .from('leagues')
        .select('league_id, countries_code, schedule')
        .eq('league_id', leagueId)
        .single();

    if (leagueErr) throw error(500, `league read failed: ${leagueErr.message}`);
    if (!league) throw error(404, `league ${leagueId} not found`);
    if (!league.schedule) throw error(400, `league ${leagueId} has no schedule`);
    if (!league.countries_code) throw error(400, `league ${leagueId} has no countries_code`);

    // ---- current league_week for this league's country ----
    const { data: info, error: infoErr } = await supabase
        .from('league_info_reference')
        .select('league_week')
        .eq('countries_code', league.countries_code)
        .single();

    if (infoErr) throw error(500, `league_info_reference read failed: ${infoErr.message}`);
    const week = info?.league_week;
    if (week == null) throw error(400, `no league_week for countries_code ${league.countries_code}`);

    const matchups = league.schedule[String(week)];
    if (!matchups?.length) {
        throw error(400, `no schedule entry for league_week ${week} (keys: ${Object.keys(league.schedule).join(', ')})`);
    }

    // ---- frontend_number -> team_id ----
    const { data: teams, error: teamsErr } = await supabaseScaling
        .from('teams')
        .select('team_id, frontend_number')
        .eq('league_id', leagueId);

    if (teamsErr) throw error(500, `teams read failed: ${teamsErr.message}`);
    if (!teams?.length) throw error(400, `no teams for league ${leagueId}`);

    // playerTeam is frontend_number 0, AI teams are 1..n — so test for null,
    // never truthiness.
    const byNumber = new Map<number, number>();
    for (const t of teams) {
        if (t.frontend_number != null) byNumber.set(t.frontend_number, t.team_id);
    }

    // ---- build the paired updates ----
    const updates: { team_id: number; next_matchup: number; home: boolean }[] = [];
    const unresolved: string[] = [];

    for (const [home, away] of matchups) {
        const h = byNumber.get(home);
        const a = byNumber.get(away);
        if (h != null && a != null) {
            updates.push({ team_id: h, next_matchup: a, home: true });
            updates.push({ team_id: a, next_matchup: h, home: false });
        } else {
            unresolved.push(`${home}v${away}`);
        }
    }

    if (!updates.length) {
        // The most likely cause on a fresh draft: the schedule's numbers don't
        // match frontend_number in the teams table.
        throw error(
            400,
            `league ${leagueId}: schedule for week ${week} produced 0 valid pairs. ` +
            `scheduled=${JSON.stringify(matchups)} frontend_numbers=${JSON.stringify([...byNumber.keys()].sort((x, y) => x - y))}`
        );
    }

    // ---- write both tables ----
    const teamWrites = updates.map((u) =>
        supabaseScaling.from('teams')
            .update({ next_matchup: u.next_matchup, home: u.home })
            .eq('team_id', u.team_id));

    const playerWrites = updates.map((u) =>
        supabaseScaling.from('team_players')
            .update({ next_matchup: u.next_matchup, home: u.home })
            .eq('team_id', u.team_id));

    const results = await Promise.allSettled([...teamWrites, ...playerWrites]);

    // allSettled only rejects on a thrown error; supabase returns { error } on
    // a fulfilled promise, so check both.
    const failed: string[] = [];
    results.forEach((r, i) => {
        const table = i < updates.length ? 'teams' : 'team_players';
        const u = updates[i % updates.length];
        if (r.status === 'rejected') {
            failed.push(`${table} ${u.team_id}: ${r.reason?.message ?? r.reason}`);
        } else if ((r.value as any)?.error) {
            failed.push(`${table} ${u.team_id}: ${(r.value as any).error.message}`);
        }
    });

    if (failed.length) {
        console.error(`[next_matchups] league ${leagueId}: ${failed.length} write failures`, failed);
        throw error(500, `${failed.length} writes failed: ${failed.slice(0, 3).join('; ')}`);
    }

    console.log(
        `[next_matchups] league ${leagueId}: week ${week}, ${updates.length / 2} matchups, ` +
        `${updates.length} teams updated${unresolved.length ? `, ${unresolved.length} unresolved pairs` : ''}`
    );

    return json({
        ok: true,
        leagueId,
        week,
        matchups: updates.length / 2,
        teamsUpdated: updates.length,
        unresolved
    });
};