import { formationConfig } from "$lib/data/formationConfig";
import type { Player, Team } from "$lib/types/types";
import { playersByID } from "$lib/stores/generic.svelte";
import { resetScores } from "./team";
import { getFallbackPos} from "$lib/data/fallbackOrder";


// ═════════════════════════════════════════════════════════════════════════════
// Zone Data
// ═════════════════════════════════════════════════════════════════════════════

export const zoneMatchups = {
    3: 17,   // LB vs RW
    4: 16,   // CB vs ST
    5: 15,   // RB vs LW

    6: 14,
    7: 13,
    8: 12,

    9: 11,
    10: 10,
    11: 9,

    12: 8,
    13: 7,
    14: 6,

    15: 5,   // LW vs RB
    16: 4,   // ST vs CB
    17: 3,   // RW vs LB

    // Unused zones
    0: null,
    2: null,
};

export const zoneAdjacency = {
    1: [],   // Keeper not factored for matchup view
    3: [4, 6],
    4: [3, 5, 7],
    5: [4, 8],
    6: [3, 7, 9],
    7: [4, 6, 8, 10],
    8: [5, 7, 11],
    9: [6, 10, 12],
    10: [7, 9, 11, 13],
    11: [8, 10, 14],
    12: [9, 13, 15],
    13: [10, 12, 14, 16],
    14: [11, 13, 17],
    15: [12, 16],
    16: [13, 15, 17],
    17: [14, 16]
};


// ═════════════════════════════════════════════════════════════════════════════
// Shared Constants & Helpers
// ═════════════════════════════════════════════════════════════════════════════

const posOrder = [
    'Goalkeeper',
    'Defensive Midfield',
    'Attacking Midfield',
    'Centre Back',
    'Centre Forward',
    'Central Midfield',
    'Left Back',
    'Right Back',
    'Left Wing',
    'Right Wing',
    'Left-Mid',
    'Right-Mid'
];

/** Accumulate a player's scores into the appropriate team.scores bucket. */
function addPlayerScores(team: Team, player: Player, group: string): void {
    const scoreKey = group === 'keepers' ? 'keeper' : group;
    if (!team.scores[scoreKey]) {
        console.log(`Score key "${scoreKey}" not found in team.scores for group "${group}".`);
        return;
    }

    if (scoreKey !== 'keeper') {
        team.scores[scoreKey].finishing  += player.finishing_score || 0;
        team.scores[scoreKey].attacking  += player.attacking_score || 0;
        team.scores[scoreKey].defense    += player.defensive_score || 0;
        team.scores[scoreKey].possession += player.possession_score || 0;
        team.scores[scoreKey].passing    += player.passing_score || 0;
    } else {
        team.scores.keeper.passing += player.passing_score || 0;
        team.scores.keeper.keeping += player.keeper_score || 0;
    }
}

/**
 * Checks whether a player is eligible for a formation slot.
 * A player can fill a slot if:
 *   - Their detailed_position exactly matches the slot, OR
 *   - Their detailed_position appears in fallbackOrder[slot]
 */
function isEligibleForPosition(player: Player, slotPosition: string): boolean {
    if (player.detailed_position === slotPosition) return true;
    const allowed = getFallbackPos(slotPosition);
    return allowed ? allowed.includes(player.detailed_position) : false;
}


// ═════════════════════════════════════════════════════════════════════════════
// Formation Structure
// ═════════════════════════════════════════════════════════════════════════════

export function createFormationStructure(formationName: string): object {
    const config = formationConfig[formationName];
    const structure = {};
    config.forEach(([group, ...positions]) => {
        structure[group] = {};
        positions.forEach(([pos, max, zone]) => {
            structure[group][pos] = { players: [], max, zone };
        });
    });
    return structure;
}


// ═════════════════════════════════════════════════════════════════════════════
// Auto-Pick Lineup (Basic)
// ═════════════════════════════════════════════════════════════════════════════

export function populateLineup(team: Team): void {
    const selected = team.selected;
    const usedIds = new Set();
    const injuredIds = new Set();

    const allSelected = Object.keys(selected).flatMap(group => team[group] || []);

    for (const player of allSelected) {
        if (player.injured) {
            injuredIds.add(player.id);
        }
    }

    const getAvailablePlayer = (players, detailedPosition) =>
        players.find(p => p.detailed_position === detailedPosition && !usedIds.has(p.id) && !injuredIds.has(p.id));

    const getFallbackPlayer = pos => {
        for (const alt of (getFallbackPos(pos) || [])) {
            const candidate = allSelected.find(p => p.detailed_position === alt && !usedIds.has(p.id) && !injuredIds.has(p.id));
            if (candidate) return candidate;
        }
        return null;
    };

    resetScores(team);

    const positionLookup = {};
    Object.entries(selected).forEach(([group, positions]) => {
        Object.entries(positions).forEach(([pos, cfg]) => {
            cfg.players = [];
            positionLookup[pos] = { group, cfg };
        });
    });

    posOrder.forEach(posToFill => {
        const lookup = positionLookup[posToFill];
        if (lookup) {
            const { group, cfg } = lookup;
            const pool = team[group] || [];
            const picked = [];

            for (let i = 0; i < cfg.max; i++) {
                const exact = getAvailablePlayer(pool, posToFill);
                const fallbackMatch = exact || getFallbackPlayer(posToFill);

                if (fallbackMatch) {
                    if (usedIds.has(fallbackMatch.id)) {
                        console.log(`Attempting to reuse player ${fallbackMatch.id} for ${posToFill}. Skipping.`);
                        continue;
                    }
                    picked.push(fallbackMatch);
                    usedIds.add(fallbackMatch.id);
                    addPlayerScores(team, fallbackMatch, group);
                }
            }
            cfg.players = picked;
        }
    });

    team.unused = allSelected.filter(p => !usedIds.has(p.id));

    const substituteSlots = Object.values(selected)
        .flatMap(positions =>
            Object.values(positions)
                .flatMap(cfg => Array(cfg.players.length).fill(cfg))
        );

    team.subs.length = 0;
    for (const slotCfg of substituteSlots) {
        if (team.subs.length >= 7) break;
        const pos = slotCfg.players[0]?.detailed_position || null;
        const exactSub = allSelected.find(p => p.detailed_position === pos && !usedIds.has(p.id) && !injuredIds.has(p.id));
        const candidate = exactSub || getFallbackPlayer(pos);

        if (candidate) {
            if (!usedIds.has(candidate.id)) {
                team.subs.push(candidate);
                usedIds.add(candidate.id);
            }
        }
    }

    team.unused = allSelected.filter(p => !usedIds.has(p.id));
}


// ═════════════════════════════════════════════════════════════════════════════
// Tactical Lineup (Player-Ranked, Counter-Based)
// ═════════════════════════════════════════════════════════════════════════════
//
// High-level flow:
//   Step 0: Run baseline populateLineup to guarantee all slots CAN fill.
//   Step 1: Rank our available squad by strategy score → identify must-starts.
//   Step 2: Rank opponent counter-zones (up to 5).
//   Step 3: Build counter-zone → our slot mapping with priorities.
//   Step 4: Place must-starts (top N by score, where N = starting slots),
//           preferring counter-zone positions when the player is eligible.
//           Each placement is validated: if it would leave a downstream slot
//           unfillable, try the next eligible slot or defer the player.
//   Step 5: Fill any remaining slots from leftover eligible players.
//   Step 6: Validate — if any slot is still empty, revert to baseline.
//   Step 7: Commit placements to team.selected, fill subs & unused.
//
// ═════════════════════════════════════════════════════════════════════════════

type Strategy = 'attacking' | 'balanced' | 'defensive';

interface CounterZone {
    zone: number;
    score: number;
    opponentPosition: string;
    opponentPlayer: Player | null;
}

/** Flattened slot descriptor used internally during placement. */
interface FormationSlot {
    group: string;
    pos: string;
    zone: number;
    max: number;
    placed: Player[];
}

// ─── Scoring: Evaluate Opponent Zones ────────────────────────────────────────

function getDefensiveScore(player: Player): number {
    return player.defensive_score || 0;
}

function getOverallScore(player: Player): number {
    return (player.finishing_score || 0)
         + (player.attacking_score || 0)
         + (player.defensive_score || 0)
         + (player.possession_score || 0)
         + (player.passing_score || 0);
}

function getOffensiveScore(player: Player): number {
    return (player.passing_score || 0)
         + (player.finishing_score || 0)
         + (player.attacking_score || 0);
}

// ─── Scoring: Evaluate Our Players ───────────────────────────────────────────

function getOurOffensiveScore(player: Player): number {
    return (player.finishing_score || 0)
         + (player.attacking_score || 0)
         + (player.passing_score || 0);
}

function getOurDefensiveScore(player: Player): number {
    return player.defensive_score || 0;
}

function getOurOverallScore(player: Player): number {
    return (player.finishing_score || 0)
         + (player.attacking_score || 0)
         + (player.defensive_score || 0)
         + (player.possession_score || 0)
         + (player.passing_score || 0);
}

/** Score a player according to the current strategy. */
function scorePlayerByStrategy(player: Player, strategy: Strategy): number {
    switch (strategy) {
        case 'attacking':  return getOurOffensiveScore(player);
        case 'defensive':  return getOurDefensiveScore(player);
        case 'balanced':
        default:           return getOurOverallScore(player);
    }
}

// ─── Tactical Internals ──────────────────────────────────────────────────────

/**
 * Scores each occupied opponent zone based on strategy, returns up to 5 ranked.
 *
 * - Attacking:  opponent's LOWEST defensive score (exploit weak defenders)
 * - Balanced:   opponent's LOWEST overall score (target weakest links)
 * - Defensive:  opponent's HIGHEST offensive score (shut down their threats)
 */
function rankCounterZones(opponentTeam: Team, strategy: Strategy): CounterZone[] {
    const counterZones: CounterZone[] = [];

    Object.entries(opponentTeam.selected).forEach(([group, positions]) => {
        if (group === 'keepers') return;

        Object.entries(positions).forEach(([pos, cfg]) => {
            const zone = cfg.zone;
            if (!zone || zone === 0 || zone === 2) return;

            for (const player of cfg.players) {
                if (!player) continue;

                let score: number;
                switch (strategy) {
                    case 'attacking':
                        score = getDefensiveScore(player);
                        break;
                    case 'balanced':
                        score = getOverallScore(player);
                        break;
                    case 'defensive':
                        score = getOffensiveScore(player);
                        break;
                }

                counterZones.push({ zone, score, opponentPosition: pos, opponentPlayer: player });
            }
        });
    });

    if (strategy === 'defensive') {
        counterZones.sort((a, b) => b.score - a.score);
    } else {
        counterZones.sort((a, b) => a.score - b.score);
    }

    return counterZones.slice(0, 5);
}

/** Flatten team.selected into an array of FormationSlots for easier iteration. */
function buildSlotList(selected: Team['selected']): FormationSlot[] {
    const slots: FormationSlot[] = [];
    Object.entries(selected).forEach(([group, positions]) => {
        Object.entries(positions).forEach(([pos, cfg]) => {
            slots.push({ group, pos, zone: cfg.zone, max: cfg.max, placed: [] });
        });
    });
    return slots;
}

/**
 * Find which of our formation slots oppose a given opponent zone.
 * Checks direct zoneMatchup first, then adjacency fallback.
 */
function findSlotsForCounterZone(slots: FormationSlot[], targetZone: number): FormationSlot[] {
    const byZone: Record<number, FormationSlot[]> = {};
    for (const slot of slots) {
        if (!byZone[slot.zone]) byZone[slot.zone] = [];
        byZone[slot.zone].push(slot);
    }

    // 1) Direct: our zones where zoneMatchups[ourZone] === targetZone
    const direct: FormationSlot[] = [];
    for (const [ourZoneStr, opposingZone] of Object.entries(zoneMatchups)) {
        const ourZone = Number(ourZoneStr);
        if (opposingZone === targetZone && byZone[ourZone]) {
            direct.push(...byZone[ourZone]);
        }
    }
    if (direct.length > 0) return direct;

    // 2) Adjacency fallback
    const adjacent: FormationSlot[] = [];
    const directOurZones: number[] = [];
    for (const [ourZoneStr, opposingZone] of Object.entries(zoneMatchups)) {
        if (opposingZone === targetZone) directOurZones.push(Number(ourZoneStr));
    }
    for (const dz of directOurZones) {
        for (const adjZone of (zoneAdjacency[dz] || [])) {
            if (byZone[adjZone]) adjacent.push(...byZone[adjZone]);
        }
    }
    return adjacent;
}

/**
 * Greedy validation: given current placement state + remaining available players,
 * can every unfilled seat find at least one eligible candidate?
 *
 * Not a full constraint solver, but catches the common case of a slot being
 * starved of eligible players.
 */
function canFillAllSlots(
    slots: FormationSlot[],
    availablePlayers: Player[],
    usedIds: Set<number>,
    injuredIds: Set<number>
): boolean {
    const simUsed = new Set(usedIds);

    for (const slot of slots) {
        const needed = slot.max - slot.placed.length;
        for (let i = 0; i < needed; i++) {
            const candidate = availablePlayers.find(p =>
                !simUsed.has(p.id) &&
                !injuredIds.has(p.id) &&
                isEligibleForPosition(p, slot.pos)
            );
            if (!candidate) return false;
            simUsed.add(candidate.id);
        }
    }
    return true;
}

// ─── Tactical Main: populateLineupTactical ───────────────────────────────────

/**
 * Populates team lineup tactically, countering the opponent while guaranteeing:
 *   1. All positions are filled (falls back to basic populateLineup if not)
 *   2. The best players by strategy always start
 *   3. Counter-zone preference determines WHERE the best players are placed
 */
export function populateLineupTactical(
    team: Team,
    opponentTeam: Team,
    strategy: Strategy = 'balanced'
): void {

    // ── Step 0: Baseline ───────────────────────────────────────────────────
    // Run basic auto-pick first. Guarantees a valid lineup exists.
    // Snapshot it for fallback if tactical pass fails.

    populateLineup(team);

    const baselineSnapshot: Record<string, number[]> = {};
    Object.entries(team.selected).forEach(([group, positions]) => {
        Object.entries(positions).forEach(([pos, cfg]) => {
            baselineSnapshot[pos] = cfg.players.map(p => p.id);
        });
    });
    const baselineSubs = [...team.subs];
    const baselineUnused = [...team.unused];

    // ── Gather available players ───────────────────────────────────────────

    const selected = team.selected;
    const injuredIds = new Set<number>();
    const allSelected: Player[] = Object.keys(selected).flatMap(group => team[group] || []);

    for (const player of allSelected) {
        if (player.injured) injuredIds.add(player.id);
    }

    const available = allSelected.filter(p => !injuredIds.has(p.id));

    // ── Step 1: Rank our squad ─────────────────────────────────────────────
    // Sort all available players by strategy score, best first.

    const rankedSquad = [...available].sort((a, b) =>
        scorePlayerByStrategy(b, strategy) - scorePlayerByStrategy(a, strategy)
    );

    const slots = buildSlotList(selected);
    const totalStarters = 11

    // Top N are must-starts, provided each has at least one eligible slot.
    const mustStarts: Player[] = [];
    const remainingPool: Player[] = [];

    for (const player of rankedSquad) {
        if (mustStarts.length < totalStarters) {
            const hasEligibleSlot = slots.some(s => isEligibleForPosition(player, s.pos));
            if (hasEligibleSlot) {
                mustStarts.push(player);
            } else {
                remainingPool.push(player);
            }
        } else {
            remainingPool.push(player);
        }
    }

    console.log(`[Tactical] Strategy: ${strategy}`);
    console.log(`[Tactical] Must-starts (${mustStarts.length}):`,
        mustStarts.map(p => `${p.detailed_position} (ID: ${p.id}, score: ${scorePlayerByStrategy(p, strategy)})`)
    );

    // ── Step 2: Rank opponent counter-zones ────────────────────────────────

    const counterZones = rankCounterZones(opponentTeam, strategy);

    console.log(`[Tactical] Top ${counterZones.length} counter-zones:`,
        counterZones.map(cz => `Zone ${cz.zone} (${cz.opponentPosition}, score: ${cz.score})`)
    );

    // ── Step 3: Map counter-zones to our slots ─────────────────────────────
    // Build priority: for each of our slot positions, what's the best (lowest)
    // counter-zone priority it maps to? Lower number = more important to fill
    // with a strong player.

    const counterZonePriority: Record<number, number> = {};
    counterZones.forEach((cz, idx) => {
        if (counterZonePriority[cz.zone] === undefined || idx < counterZonePriority[cz.zone]) {
            counterZonePriority[cz.zone] = idx;
        }
    });

    const counterSlotSets: Map<number, FormationSlot[]> = new Map();
    for (const cz of counterZones) {
        if (!counterSlotSets.has(cz.zone)) {
            counterSlotSets.set(cz.zone, findSlotsForCounterZone(slots, cz.zone));
        }
    }

    // pos → best counter-zone priority (lower = more tactically important)
    const counterSlotPriority: Map<string, number> = new Map();
    for (const [oppZone, ourSlots] of counterSlotSets.entries()) {
        const pri = counterZonePriority[oppZone] ?? 99;
        for (const slot of ourSlots) {
            const existing = counterSlotPriority.get(slot.pos);
            if (existing === undefined || pri < existing) {
                counterSlotPriority.set(slot.pos, pri);
            }
        }
    }

    // ── Step 4: Place must-starts ──────────────────────────────────────────
    // Iterate in rank order (best player first).
    // For each player, find eligible slots. Prefer counter-zone slots (by
    // priority), then exact position match, then anything open.
    // Before committing each placement, validate that remaining slots can
    // still be filled (Option A rollback check).

    const usedIds = new Set<number>();
    for (const slot of slots) slot.placed = [];

    for (const player of mustStarts) {
        const eligibleSlots = slots.filter(s =>
            s.placed.length < s.max &&
            isEligibleForPosition(player, s.pos)
        );

        if (eligibleSlots.length === 0) {
            console.log(`[Tactical] No open eligible slot for must-start ${player.id} (${player.detailed_position})`);
            remainingPool.push(player);
            continue;
        }

        // Sort: counter-zone priority first, then exact position match
        eligibleSlots.sort((a, b) => {
            const aPri = counterSlotPriority.get(a.pos) ?? 99;
            const bPri = counterSlotPriority.get(b.pos) ?? 99;
            if (aPri !== bPri) return aPri - bPri;

            const aExact = a.pos === player.detailed_position ? 0 : 1;
            const bExact = b.pos === player.detailed_position ? 0 : 1;
            return aExact - bExact;
        });

        // Try each eligible slot; commit to first that doesn't break fillability
        let placed = false;
        for (const slot of eligibleSlots) {
            slot.placed.push(player);
            usedIds.add(player.id);

            // Check: can all remaining seats still be filled?
            const combinedPool = [...remainingPool, ...mustStarts.filter(p => !usedIds.has(p.id))];
            if (canFillAllSlots(slots, combinedPool, usedIds, injuredIds)) {
                placed = true;
                const czPri = counterSlotPriority.get(slot.pos);
                console.log(`[Tactical] Placed ${player.detailed_position} (ID: ${player.id}) → ${slot.pos} (zone ${slot.zone})${czPri !== undefined && czPri < 99 ? ` [counter #${czPri + 1}]` : ''}`);
                break;
            }

            // Rollback
            slot.placed.pop();
            usedIds.delete(player.id);
        }

        if (!placed) {
            console.log(`[Tactical] Could not place must-start ${player.id} without breaking fillability. Deferring.`);
            remainingPool.push(player);
        }
    }

    // ── Step 5: Fill remaining slots ───────────────────────────────────────
    // Any seats still open get filled from remainingPool by strategy score.

    remainingPool.sort((a, b) =>
        scorePlayerByStrategy(b, strategy) - scorePlayerByStrategy(a, strategy)
    );

    for (const slot of slots) {
        while (slot.placed.length < slot.max) {
            const candidate = remainingPool.find(p =>
                !usedIds.has(p.id) &&
                !injuredIds.has(p.id) &&
                isEligibleForPosition(p, slot.pos)
            );

            if (candidate) {
                slot.placed.push(candidate);
                usedIds.add(candidate.id);
                console.log(`[Tactical] Fill: ${candidate.detailed_position} (ID: ${candidate.id}) → ${slot.pos}`);
            } else {
                console.log(`[Tactical] WARNING: Cannot fill ${slot.pos} (need ${slot.max - slot.placed.length} more)`);
                break;
            }
        }
    }

    // ── Step 6: Validate — revert to baseline if any slot unfilled ─────────

    const hasEmptySlots = slots.some(s => s.placed.length < s.max);

    if (hasEmptySlots) {
        console.log('[Tactical] FALLBACK: Some slots unfilled, reverting to baseline lineup.');

        resetScores(team);
        Object.entries(selected).forEach(([group, positions]) => {
            Object.entries(positions).forEach(([pos, cfg]) => {
                const ids = baselineSnapshot[pos] || [];
                cfg.players = ids.map(id => allSelected.find(p => p.id === id)).filter(Boolean);
                for (const player of cfg.players) {
                    addPlayerScores(team, player, group);
                }
            });
        });
        team.subs = baselineSubs;
        team.unused = baselineUnused;
        return;
    }

    // ── Step 7: Commit placements → team.selected, subs & unused ──────────

    resetScores(team);

    for (const slot of slots) {
        const cfg = selected[slot.group]?.[slot.pos];
        if (cfg) {
            cfg.players = [...slot.placed];
            for (const player of slot.placed) {
                addPlayerScores(team, player, slot.group);
            }
        }
    }

    // Subs: best remaining non-injured by strategy score
    team.subs.length = 0;
    const subCandidates = available
        .filter(p => !usedIds.has(p.id))
        .sort((a, b) => scorePlayerByStrategy(b, strategy) - scorePlayerByStrategy(a, strategy));

    for (const player of subCandidates) {
        if (team.subs.length >= 7) break;
        team.subs.push(player);
        usedIds.add(player.id);
    }

    // Unused: everyone else (including injured)
    team.unused = allSelected.filter(p => !usedIds.has(p.id));
}


// ═════════════════════════════════════════════════════════════════════════════
// Serialization & Hydration
// ═════════════════════════════════════════════════════════════════════════════

export function extractPlayerIds(team: Team): object {
    const lightweightSelected = {};

    Object.entries(team.selected).forEach(([group, positions]) => {
        lightweightSelected[group] = {};

        Object.entries(positions).forEach(([pos, cfg]) => {
            lightweightSelected[group][pos] = {
                players: cfg.players.map(player => {
                    if (player === null || player === undefined) return null;
                    return typeof player === 'number' ? player : player.id;
                }),
                max: cfg.max,
                zone: cfg.zone
            };
        });
    });

    console.log('Team subs length', team.subs.length);
    console.log('Team subs during extraction', JSON.stringify(team.subs));

    const lightweightSubs = team.subs.map(player => {
        if (player === null || player === undefined) return null;
        return typeof player === 'number' ? player : player.id;
    });

    const lightweightUnused = team.unused.map(player => {
        if (player === null || player === undefined) return null;
        return typeof player === 'number' ? player : player.id;
    });

    return {
        selected: lightweightSelected,
        subs: lightweightSubs,
        unused: lightweightUnused
    };
}

export function hydrateSelected(team: Team): void {
    const injuredPlayers: Player[] = [];

    Object.entries(team.selected).forEach(([group, positions]) => {
        Object.entries(positions).forEach(([pos, cfg]) => {
            cfg.players = (cfg.players as number[]).map(playerId => {
                if (playerId === null || playerId === undefined) return null;

                const player = playersByID[playerId];
                if (!player) {
                    console.warn(`Player with ID ${playerId} not found in playersByID`);
                    return null;
                }
                if (player.injured) {
                    injuredPlayers.push(player);
                    return null;
                }
                return player;
            }).filter(p => p !== null);
        });
    });

    team.subs = (team.subs as number[]).map(playerId => {
        if (playerId === null || playerId === undefined) return null;
        const player = playersByID[playerId];
        if (!player) {
            console.warn(`Sub player with ID ${playerId} not found in playersByID`);
            return null;
        }
        if (player.injured) {
            injuredPlayers.push(player);
            return null;
        }
        return player;
    }).filter(p => p !== null);

    team.unused = (team.unused as number[]).map(playerId => {
        if (playerId === null || playerId === undefined) return null;
        const player = playersByID[playerId];
        if (!player) {
            console.warn(`Unused player with ID ${playerId} not found in playersByID`);
            return null;
        }
        return player;
    }).filter(p => p !== null);

    team.unused.push(...injuredPlayers);
}


// ═════════════════════════════════════════════════════════════════════════════
// Lineup Teardown & Batch Setup
// ═════════════════════════════════════════════════════════════════════════════

export function dePopulateTeam(team: Team): void {
    const selectedPlayers: Player[] = [];

    Object.entries(team.selected).forEach(([group, positions]) => {
        Object.entries(positions).forEach(([pos, cfg]) => {
            cfg.players.forEach(player => {
                if (player !== null && player !== undefined) {
                    selectedPlayers.push(player as Player);
                }
            });
            cfg.players = [];
        });
    });

    const existingIds = new Set<number>();
    team.subs.forEach(p => {
        if (p) existingIds.add((p as Player).id);
    });
    team.unused.forEach(p => {
        if (p) existingIds.add((p as Player).id);
    });

    const newPlayers = selectedPlayers.filter(p => !existingIds.has(p.id));

    newPlayers.forEach(player => {
        if (team.subs.length < 7) {
            team.subs.push(player);
        } else {
            team.unused.push(player);
        }
    });

    resetScores(team);
}

export function setSelected(teams) {
    Object.values(teams).forEach((team: Team) => {
        if (team.formation) {
            createFormationStructure(team.formation);
            populateLineup(team);
        }
    });
}