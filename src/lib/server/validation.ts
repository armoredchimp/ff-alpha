

import type { RequestEvent } from '@sveltejs/kit';
import { getSession } from '$lib/server/auth';
import { supabaseScaling } from '$lib/client/supabase/supaClient';
import { formationConfig } from '$lib/data/formationConfig'

export interface ValidationError {
    ok: false;
    status: number;
    error: string;
}
export interface Resolved<T> {
    ok: true;
    value: T;
}
export type Result<T> = Resolved<T> | ValidationError;

const fail = (status: number, error: string): ValidationError => ({ ok: false, status, error });
const ok = <T>(value: T): Resolved<T> => ({ ok: true, value });

// ------------------------------------------------------------
//
// Returns the team_id the authenticated requester is allowed to write.
//
// Today (single-player): the human is the frontend_number 0 team in the
// session's league. This is secure because the session's leagueId IS the
// owning user's Cognito id (httpOnly, server-managed cookie), so holding the
// cookie for a league proves ownership of it.

export async function resolveRequesterTeam(event: RequestEvent): Promise<Result<number>> {
    const session = getSession(event.cookies);
    if (!session || !session.leagueId) {
        return fail(401, 'Not authenticated');
    }

    const { data, error } = await supabaseScaling
        .from('teams')
        .select('team_id')
        .eq('league_id', session.leagueId)
        .eq('frontend_number', 0)
        .single();

    if (error || !data) {
        return fail(404, 'No team found for this user');
    }
    return ok(data.team_id as number);
}


export interface StoredRoster {
    all: Set<number>;
    attackers: number[];
    midfielders: number[];
    defenders: number[];
    keepers: number[];
}

export async function loadStoredRoster(teamId: number): Promise<Result<StoredRoster>> {
    const { data, error } = await supabaseScaling
        .from('team_players')
        .select('attackers, midfielders, defenders, keepers')
        .eq('team_id', teamId)
        .single();

    if (error || !data) {
        return fail(404, 'No roster found for this team');
    }

    const attackers = data.attackers ?? [];
    const midfielders = data.midfielders ?? [];
    const defenders = data.defenders ?? [];
    const keepers = data.keepers ?? [];
    const all = new Set<number>([...attackers, ...midfielders, ...defenders, ...keepers]);

    return ok({ all, attackers, midfielders, defenders, keepers });
}

// ------------------------------------------------------------
// assertIdsSubset — the reusable primitive. Every submitted id must be in the
// allowed set, or the whole thing is rejected. Reused by the draft-creation
// validator with the player pool as the allowed set.
// ------------------------------------------------------------
export function assertIdsSubset(submitted: number[], allowed: Set<number>, label: string): ValidationError | null {
    for (const id of submitted) {
        if (id == null) continue;
        if (!allowed.has(id)) {
            return fail(400, `${label} contains id ${id} not in the allowed set`);
        }
    }
    return null;
}

// ------------------------------------------------------------
// flattenSelected — pull every player id out of a `selected` structure
// (formation groups -> positions -> players id arrays).
// ------------------------------------------------------------
export function flattenSelected(selected: any): number[] {
    const ids: number[] = [];
    if (!selected || typeof selected !== 'object') return ids;
    for (const group of Object.values(selected) as any[]) {
        if (!group || typeof group !== 'object') continue;
        for (const position of Object.values(group) as any[]) {
            for (const pid of (position?.players ?? [])) {
                if (pid != null) ids.push(pid);
            }
        }
    }
    return ids;
}

// ------------------------------------------------------------
// isValidFormation — formation must be a real formationConfig key.
// ------------------------------------------------------------
export function isValidFormation(formation: unknown): formation is string {
    return typeof formation === 'string' && Object.prototype.hasOwnProperty.call(formationConfig, formation);
}


export async function validateFavored(
    favored: any,
    roster: StoredRoster
): Promise<ValidationError | null> {
    if (!favored || typeof favored !== 'object') return null; // empty/absent favored is fine
    const entries = Object.entries(favored);
    if (entries.length === 0) return null;

    // player ids referenced by favored
    const playerIds = entries.map(([pid]) => Number(pid));

    // every favored player must be on the roster
    for (const pid of playerIds) {
        if (!roster.all.has(pid)) {
            return fail(400, `favored references player ${pid} not on the roster`);
        }
    }

    // load the real upcoming fixtures for those players, build allowed (player -> fixture) pairs
    const { supabase } = await import('$lib/client/supabase/supaClient');
    const { data: fixtures, error } = await supabase
        .from('upcoming_fixtures')
        .select('player_id, fixture_id')
        .in('player_id', playerIds);

    if (error) {
        return fail(500, 'Failed to validate favored fixtures');
    }

    const validPairs = new Set<string>();
    for (const f of fixtures ?? []) validPairs.add(`${f.player_id}:${f.fixture_id}`);

    for (const [pidStr, fixtureId] of entries) {
        const key = `${Number(pidStr)}:${fixtureId}`;
        if (!validPairs.has(key)) {
            return fail(400, `favored fixture ${fixtureId} is not a valid current fixture for player ${pidStr}`);
        }
    }

    return null;
}