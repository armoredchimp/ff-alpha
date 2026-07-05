// Server-authoritative draft brain. All draft integrity lives here
// draft_picks is the SOURCE OF TRUTH for position + rosters

import { supabase } from '$lib/client/supabase/supaClient';
import { getPlayerValue, getPositionalNeeds } from '$lib/utils';
import { TABLE_PREFIXES, CURRENT_SEASON } from '$lib/data/leagueConstants'

export const STARTING_BUDGET = 500000;
export const TOTAL_ROUNDS = 16;

// ------------------------------------------------------------
// Pool cache — per prefix+season reference data. Cache miss reloads.
// ------------------------------------------------------------
const poolCache = new Map<string, any[]>();

export function prefixForCountry(countriesCode: number): string | null {
    return TABLE_PREFIXES[countriesCode] ?? null;
}

export async function loadPool(prefix: string, season: string = CURRENT_SEASON): Promise<any[]> {
    const key = `${prefix}_${season}`;
    const cached = poolCache.get(key);
    if (cached) return cached;

    const table = `${prefix}_mini_${season}`;
 
    const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('transfer_value', { ascending: false });
    if (error) throw new Error(`Pool load failed (${table}): ${error.message}`);

    const pool = data ?? [];
    poolCache.set(key, pool);
    return pool;
}

// ------------------------------------------------------------
// Draft order — server-side snake order over the created teams.
// teams: [{ team_id, frontend_number, draft_order }]
// Returns a trimmed order (only what turn-resolution needs), stored as
// draft_state.draft_order.
// ------------------------------------------------------------
export interface OrderEntry {
    teamId: number;
    frontendNumber: number;
    round: number;
    pick: number;
    overallPick: number;   // 1-indexed
}

export function generateDraftOrder(teams: any[], totalRounds: number = TOTAL_ROUNDS): OrderEntry[] {
    // draft_order is the random seed determining snake position (server-assigned).
    const sorted = [...teams].sort((a, b) => a.draft_order - b.draft_order);
    const teamCount = sorted.length;
    const order: OrderEntry[] = [];

    for (let round = 0; round < totalRounds; round++) {
        const roundTeams = round % 2 === 0 ? sorted : [...sorted].reverse();
        roundTeams.forEach((team, index) => {
            order.push({
                teamId: team.team_id,
                frontendNumber: team.frontend_number,
                round: round + 1,
                pick: index + 1,
                overallPick: round * teamCount + index + 1
            });
        });
    }
    return order;
}


export interface TeamState {
    team_id: number;
    formation: string;
    traits: string[];
    frontend_number: number;
    budget: number;
    keepers: number[];
    defenders: number[];
    midfielders: number[];
    attackers: number[];
    playerCount: number;
}
export interface DraftState {
    draftedSet: Set<number>;
    teamState: Map<number, TeamState>;
    overallDone: number;          // picks made so far
    nextEntry: OrderEntry | null; // whose turn is next (null = order exhausted)
}

export function reconstructState(picks: any[], teams: any[], order: OrderEntry[]): DraftState {
    const draftedSet = new Set<number>();
    const teamState = new Map<number, TeamState>();

    for (const t of teams) {
        teamState.set(t.team_id, {
            team_id: t.team_id,
            formation: t.formation,
            traits: t.traits ?? [],
            frontend_number: t.frontend_number,
            budget: STARTING_BUDGET,
            keepers: [], defenders: [], midfielders: [], attackers: [],
            playerCount: 0
        });
    }

    for (const pick of picks) {
        if (pick.player_id == null) continue;
        draftedSet.add(pick.player_id);
        const ts = teamState.get(pick.team_id);
        if (!ts) continue;
        ts.budget -= pick.transfer_value;
        ts.playerCount++;
        switch (pick.position) {
            case 'Goalkeeper': ts.keepers.push(pick.player_id); break;
            case 'Defender':   ts.defenders.push(pick.player_id); break;
            case 'Midfielder': ts.midfielders.push(pick.player_id); break;
            case 'Attacker':   ts.attackers.push(pick.player_id); break;
        }
    }

    const overallDone = picks.length;
    const nextEntry = order[overallDone] ?? null;

    return { draftedSet, teamState, overallDone, nextEntry };
}

// ------------------------------------------------------------
// Affordable-players helper (shared by AI selection + broke detection).
// ------------------------------------------------------------
function affordableFor(ts: TeamState, pool: any[], draftedSet: Set<number>): any[] {
    return pool.filter(p => !draftedSet.has(p.id) && p.transfer_value <= ts.budget);
}

// ------------------------------------------------------------
// AI pick selection — ports executePick's AI branch verbatim in logic.
// Returns the chosen player, or a broke/none signal.
// ------------------------------------------------------------
export type AiPickResult =
    | { player: any }
    | { broke: true }
    | { none: true };

export function selectAiPick(ts: TeamState, pool: any[], draftedSet: Set<number>): AiPickResult {
    const traits = ts.traits ?? [];
    const affordable = affordableFor(ts, pool, draftedSet);

    // original: < 15 affordable => team is out of money for the rest of the draft
    if (affordable.length < 15) return { broke: true };
    if (affordable.length < 1) return { none: true };

    const positionScores: any = getPositionalNeeds(ts, traits);

    const window = affordable.slice(0, Math.floor(Math.random() * 12) + 15);
    const scored = window
        .map((p, index) => ({
            ...p,
            score: getPlayerValue(index, p, traits) + (positionScores[p.position] ?? 0)
        }))
        .sort((a, b) => b.score - a.score);

    if (scored.length < 1) return { none: true };
    return { player: scored[0] };
}

// ------------------------------------------------------------
// Human pick validation — a human may pick any real, undrafted, affordable
// player (position balance is their choice, not enforced).
// ------------------------------------------------------------
export type HumanPickResult = { ok: true; player: any } | { ok: false; error: string };

export function validateHumanPick(
    playerId: number,
    ts: TeamState,
    pool: any[],
    draftedSet: Set<number>
): HumanPickResult {
    const player = pool.find(p => p.id === playerId);
    if (!player) return { ok: false, error: 'Player not in league pool' };
    if (draftedSet.has(playerId)) return { ok: false, error: 'Player already drafted' };
    if (!player.position) return { ok: false, error: 'Player has no position' };
    if (player.transfer_value > ts.budget) return { ok: false, error: 'Insufficient budget' };
    return { ok: true, player };
}

// ------------------------------------------------------------
// Termination — all three rules, computed from authoritative state.
// ------------------------------------------------------------
export interface Termination { done: boolean; reason?: string }

export function checkTermination(state: DraftState, pool: any[], order: OrderEntry[]): Termination {
    // 1. round cap: every order slot filled
    if (state.overallDone >= order.length) return { done: true, reason: 'rounds_complete' };

    // 2. player floor: fewer than 30 undrafted remain
    const undrafted = pool.length - state.draftedSet.size;
    if (undrafted < 30) return { done: true, reason: 'players_exhausted' };

    // 3. broke teams: half or more cannot afford 15 players
    let brokeCount = 0;
    for (const ts of state.teamState.values()) {
        if (affordableFor(ts, pool, state.draftedSet).length < 15) brokeCount++;
    }
    if (brokeCount >= state.teamState.size / 2) return { done: true, reason: 'broke_teams' };

    return { done: false };
}


export function buildPickRow(leagueId: string, entry: OrderEntry, player: any) {
    return {
        league_id: leagueId,
        team_id: entry.teamId,
        player_id: player.id,
        position: player.position,
        transfer_value: Math.round(player.transfer_value),
        round: entry.round,
        pick: entry.pick,
        overall_pick: entry.overallPick
    };
}

export function buildSkipRow(leagueId: string, entry: OrderEntry) {
    return {
        league_id: leagueId,
        team_id: entry.teamId,
        player_id: null,
        position: null,
        transfer_value: 0,
        round: entry.round,
        pick: entry.pick,
        overall_pick: entry.overallPick
    };
}

export function buildTeamPlayersRows(leagueId: string, state: DraftState) {
    const rows: any[] = [];
    for (const ts of state.teamState.values()) {
        rows.push({
            league_id: leagueId,
            team_id: ts.team_id,
            attackers: ts.attackers,
            midfielders: ts.midfielders,
            defenders: ts.defenders,
            keepers: ts.keepers,
            selected: {},   // lineup set later on the team page (or AI picker)
            subs: [],
            unused: [],
            favored: {}
        });
    }
    return rows;
}


export function buildTeamBudgetUpdates(state: DraftState) {
    const updates: any[] = [];
    for (const ts of state.teamState.values()) {
        updates.push({
            team_id: ts.team_id,
            transfer_budget: ts.budget,        
            player_count: ts.playerCount
        });
    }
    return updates;
}