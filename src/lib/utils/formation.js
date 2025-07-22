import { formationConfig } from "$lib/data/formationConfig";
import { resetScores } from "./team";
import { getFallbackPos } from "$lib/data/fallbackOrder";

export function createFormationStructure(formationName) {
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

export function populateLineup(team) {
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