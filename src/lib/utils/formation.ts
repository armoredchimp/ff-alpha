import { formationConfig } from "$lib/data/formationConfig";
import type { Player } from "$lib/types/types";
import { playersByID } from "$lib/stores/generic.svelte";
import { resetScores } from "./team";
import { getFallbackPos } from "$lib/data/fallbackOrder";
import { type Team } from "$lib/types/types";

export const zoneMatchups ={
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
}

export const zoneAdjacency = {
    1: [],  // Keeper not factored for matchup view
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

export function populateLineup(team: Team): void {
    const selected = team.selected;
    const usedIds = new Set();

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
    ]

    // Retrieve all players across all position groups
    const allPlayers = Object.keys(selected).flatMap(group => team[group] || []);

    // Helper: find an unused player matching a given detailed position
    const getAvailablePlayer = (players, detailedPosition) =>
        players.find(p => p.detailed_position === detailedPosition && !usedIds.has(p.id));

    // Helper: attempt a fallback assignment for a specified position
    const getFallbackPlayer = pos => {
        for (const alt of (getFallbackPos(pos) || [])) {
          const candidate = allPlayers.find(p => p.detailed_position === alt && !usedIds.has(p.id)); // Explicitly search allPlayers for fallback
          if (candidate) return candidate;
        }
        return null;
      };

    resetScores(team)

    const positionLookup = {};
    Object.entries(selected).forEach(([group, positions]) => {
        Object.entries(positions).forEach(([pos, cfg]) => {
            cfg.players = []; // Ensure starting fresh
            positionLookup[pos] = { group, cfg };
        });
    });

    // Assign starters based on posOrder.
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
                    if(usedIds.has(fallbackMatch.id)) {
                        // This should ideally not happen if helpers check usedIds properly
                        console.log(`Attempting to reuse player ${fallbackMatch.id} for ${posToFill}. Skipping.`);
                        continue;
                    }
                    picked.push(fallbackMatch);
                    usedIds.add(fallbackMatch.id);

                    const scoreKey = group === 'keepers' ? 'keeper' : group;
                    if (team.scores[scoreKey]) {
                        if (scoreKey !== 'keeper') {
                            team.scores[scoreKey].finishing  += fallbackMatch.finishing_score || 0;
                            team.scores[scoreKey].attacking  += fallbackMatch.attacking_score || 0;
                            team.scores[scoreKey].defense    += fallbackMatch.defensive_score || 0;
                            team.scores[scoreKey].possession += fallbackMatch.possession_score || 0;
                            team.scores[scoreKey].passing    += fallbackMatch.passing_score || 0;
                        } else {
                             if(team.scores.keeper) {
                                team.scores.keeper.passing += fallbackMatch.passing_score || 0;
                                team.scores.keeper.keeping += fallbackMatch.keeper_score || 0;
                             }
                        }
                    } else {
                        console.log(`Score key "${scoreKey}" not found in team.scores for group "${group}".`);
                    }

                    // --- Original commented-out total score logic ---
                    // team.scores.total.attacking  += substitute.attacking_score;
                    // team.scores.total.defensive  += substitute.defensive_score;
                    // team.scores.total.possession += substitute.possession_score;
                    // team.scores.total.passing    += substitute.passing_score;
                    // team.scores.total.keeping    += substitute.keeping_score || 0;
                    // --- End of commented-out total score logic ---
                }
            }
            cfg.players = picked;
        }
    });

    team.unused = allPlayers.filter(p => !usedIds.has(p.id));

    const substituteSlots = Object.values(selected)
      .flatMap(positions =>
        Object.values(positions)
          .flatMap(cfg => Array(cfg.players.length).fill(cfg))
      );

    team.subs.length = 0;
    for (const slotCfg of substituteSlots) {
      if (team.subs.length >= 7) break;
      const pos = slotCfg.players[0]?.detailed_position || null;
      const exactSub = allPlayers.find(p => p.detailed_position === pos && !usedIds.has(p.id));
      const candidate = exactSub || getFallbackPlayer(pos);

      if (candidate) {
         if (!usedIds.has(candidate.id)) {
             team.subs.push(candidate);
             usedIds.add(candidate.id);
         }
      }
    }

    team.unused = allPlayers.filter(p => !usedIds.has(p.id));
}

export function extractPlayerIds(team: Team): object {
    // Create a deep copy of the selected formation structure with only IDs
    const lightweightSelected = {};
   
    Object.entries(team.selected).forEach(([group, positions]) => {
        lightweightSelected[group] = {};
       
        Object.entries(positions).forEach(([pos, cfg]) => {
            // Keep max and zone, but convert players array to just IDs
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
    console.log('Team subs length', team.subs.length)
    console.log('Team subs during extraction', JSON.stringify(team.subs))
    // Convert subs array to just IDs
    const lightweightSubs = team.subs.map(player => {
        if (player === null || player === undefined) return null;
        return typeof player === 'number' ? player : player.id;
    });
   
    // Convert unused array to just IDs
    const lightweightUnused = team.unused.map(player => {
        if (player === null || player === undefined) return null;
        return typeof player === 'number' ? player : player.id;
    });
   
    // Return the lightweight structure
    return {
        selected: lightweightSelected,
        subs: lightweightSubs,
        unused: lightweightUnused
    };
}

export function hydrateSelected(team: Team): void {
    // Hydrate the selected formation structure with full player objects
    Object.entries(team.selected).forEach(([group, positions]) => {
        Object.entries(positions).forEach(([pos, cfg]) => {
            cfg.players = (cfg.players as number[]).map(playerId => {
                if (playerId === null || playerId === undefined) {
                    return null; // Preserve null slots
                }
                
                const player = playersByID[playerId];
                if (!player) {
                    console.warn(`Player with ID ${playerId} not found in playersByID`);
                    return null;
                }
                return player;
            }); 
        });
    });
    
    team.subs = (team.subs as number[]).map(playerId => {
        if (playerId === null || playerId === undefined) {
            return null;
        }
        const player = playersByID[playerId];
        if (!player) {
            console.warn(`Sub player with ID ${playerId} not found in playersByID`);
            return null;
        }
        return player;
    });
    
    team.unused = (team.unused as number[]).map(playerId => {
        if (playerId === null || playerId === undefined) {
            return null;
        }
        const player = playersByID[playerId];
        if (!player) {
            console.warn(`Unused player with ID ${playerId} not found in playersByID`);
            return null;
        }
        return player;
    });
}


export function dePopulateTeam(team: Team): void {
    // Collect all players currently in the selected formation
    const selectedPlayers: Player[] = [];
    
    Object.entries(team.selected).forEach(([group, positions]) => {
        Object.entries(positions).forEach(([pos, cfg]) => {
            // Add all non-null players from this position
            cfg.players.forEach(player => {
                if (player !== null && player !== undefined) {
                    selectedPlayers.push(player as Player);
                }
            });
            // Clear the players array after collecting them
            cfg.players = [];
        });
    });
    
    // Create a set of existing player IDs to avoid duplicates
    const existingIds = new Set<number>();
    team.subs.forEach(p => {
        if (p) existingIds.add((p as Player).id);
    });
    team.unused.forEach(p => {
        if (p) existingIds.add((p as Player).id);
    });
    
    // Filter out players that are already in subs or unused
    const newPlayers = selectedPlayers.filter(p => !existingIds.has(p.id));
    
    // Fill subs first (up to 7 slots total)
    newPlayers.forEach(player => {
        if (team.subs.length < 7) {
            team.subs.push(player);
        } else {
            team.unused.push(player);
        }
    });
    
    // Reset scores since the lineup has been cleared
    resetScores(team);
}

export function setSelected(teams) {
   Object.values(teams).forEach((team: Team) => {
        if(team.formation){
            createFormationStructure(team.formation)
            populateLineup(team)
        }
   })
}

