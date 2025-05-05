import { formationConfig } from "$lib/data/formationConfig";

let singleNameFirsts = new Map();  // Track count of first names used alone
let doubleNameFirsts = new Map();  // Track count of first names used in combinations
let usedSecondParts = new Set();


////////////////////
//Draft Functions//
export function generateClubName(firstParts, commonNames, secondParts) {
    const isDoubleName = Math.random() < 0.8; // 80% chance for double name
    
    if (isDoubleName) {
        // Get available first parts (not used alone and used <2 times in combinations)
        const availableFirsts = firstParts.filter(name => 
            !singleNameFirsts.has(name) && 
            (doubleNameFirsts.get(name) || 0) < 2
        );
        
        const firstPart = availableFirsts[Math.floor(Math.random() * availableFirsts.length)];
        const currentCount = (doubleNameFirsts.get(firstPart) || 0) + 1;
        doubleNameFirsts.set(firstPart, currentCount);
        
        // Only set sameCity = true if this is the SECOND usage of this firstPart
        const sameCity = currentCount === 2;
        
        // For second part, either use common name or unused second part
        let secondPart;
        if (Math.random() < 0.4) {
            secondPart = commonNames[Math.floor(Math.random() * commonNames.length)];
        } else {
            const availableSeconds = secondParts.filter(name => !usedSecondParts.has(name));
            secondPart = availableSeconds[Math.floor(Math.random() * availableSeconds.length)];
            usedSecondParts.add(secondPart);
        }
        
        return {
            name: `${firstPart} ${secondPart}`,
            sameCity,
            firstName: firstPart 
        };
        
    } else {
        // Get available first parts (not used in combinations and used <2 times alone)
        const availableFirsts = firstParts.filter(name => 
            !doubleNameFirsts.has(name) && 
            !singleNameFirsts.has(name)
        );
        
        const firstPart = availableFirsts[Math.floor(Math.random() * availableFirsts.length)];
        singleNameFirsts.set(firstPart, (singleNameFirsts.get(firstPart) || 0) + 1);
        
        return {
            name: firstPart,
            sameCity: false,
            firstName: firstPart
        };
    }
}



export function assignDraftOrder(numberPool) {
    if (numberPool.length === 0) {
        return null;
    }
    
    const randomIndex = Math.floor(Math.random() * numberPool.length);
    return numberPool.splice(randomIndex, 1)[0];
}

export function organizeDraftOrder(playerTeam, teams) {
    // Get all teams including player team
    const allTeams = [
        { id: 'player', ...playerTeam },
        ...Object.entries(teams).map(([key, team]) => ({ id: key, ...team }))
    ];

    // Sort by draft order
    allTeams.sort((a, b) => a.draftOrder - b.draftOrder);

    // Create snake draft order for 15 rounds
    const fullDraftOrder = [];
    for (let round = 0; round < 15; round++) {
        if (round % 2 === 0) {
            // Forward order
            fullDraftOrder.push(...allTeams.map(team => ({
                ...team,
                round: round + 1,
                pick: round % 2 === 0 ? allTeams.indexOf(team) + 1 : allTeams.length - allTeams.indexOf(team)
            })));
        } else {
            // Reverse order
            fullDraftOrder.push(...[...allTeams].reverse().map(team => ({
                ...team,
                round: round + 1,
                pick: round % 2 === 0 ? allTeams.indexOf(team) + 1 : allTeams.length - allTeams.indexOf(team)
            })));
        }
    }

    return fullDraftOrder;
}


export function generateClubTraits() {
    const possibleTraits = [
        'Favors Defense',
        'Strong Passing',
        'High Pressure',
        'Favors Attacking',
        'Wing Play',
        'Aggressive Tackling',
        'Youth Focus',
        'Favors Experience',
        'Teamwork Focus',
        'Set Piece Specialists'
    ];
    
    // Randomly decide how many traits (0-2)
    const numTraits = Math.floor(Math.random() * 3);
    
    // Create a copy of possible traits to draw from
    const availableTraits = [...possibleTraits];
    const selectedTraits = [];
    
    // Select random traits
    for (let j = 0; j < numTraits; j++) {
        const randomIndex = Math.floor(Math.random() * availableTraits.length);
        const selectedTrait = availableTraits[randomIndex];
        selectedTraits.push(selectedTrait);
        
        // Remove selected trait to avoid duplicates
        availableTraits.splice(randomIndex, 1);
        
        // Handle mutually exclusive traits
        if (selectedTrait === 'Favors Defense') {
            const attackIndex = availableTraits.indexOf('Favors Attacking');
            if (attackIndex > -1) availableTraits.splice(attackIndex, 1);
        }
        else if (selectedTrait === 'Favors Attacking') {
            const defenseIndex = availableTraits.indexOf('Favors Defense');
            if (defenseIndex > -1) availableTraits.splice(defenseIndex, 1);
        }
        else if (selectedTrait === 'Youth Focus') {
            const experienceIndex = availableTraits.indexOf('Favors Experience');
            if (experienceIndex > -1) availableTraits.splice(experienceIndex, 1);
        }
        else if (selectedTrait === 'Favors Experience') {
            const youthIndex = availableTraits.indexOf('Youth Focus');
            if (youthIndex > -1) availableTraits.splice(youthIndex, 1);
        }
    }

    return selectedTraits;
}

export function playerName() {
    const name = prompt("Please enter a name for your team:");
    if (name !== null) {
        return name;
    }
    return '';
}
////////////////////
//Generic Utils////
export function calculateAge(date_of_birth) {
    const dob = new Date(date_of_birth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDifference = today.getMonth() - dob.getMonth();
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    return age;
}

export function positionAbbrev(detailed_position) {
    const posMap = {
        'Goalkeeper' : 'GK',
        'Centre Back' : 'CB',
        'Right Back' : 'RB',
        'Left Back' : 'LB',
        'Defensive Midfield' : 'DM',
        'Central Midfield' : 'CM',
        'Right-Mid' : 'RM',
        'Left-Mid' : 'LM',
        'Attacking Midfield' : 'AM',
        'Right Wing' : 'RW',
        'Left Wing' : 'LW',
        'Centre Forward' : 'CF'
    }

    if(posMap[detailed_position]){
        return posMap[detailed_position]
    }else {
        return detailed_position
    }
}

export function formatStatKey(stat) {
    // Insert underscores before capital letters (except the first character) and make the string lowercase
    const formattedStat = stat.replace(/([A-Z])/g, '_$1').toLowerCase();

    // Add 'avg_' at the beginning and ensure no double underscores
    return `avg_${formattedStat.replace(/^_/, '').replace(/__/g, '_')}`;
}

export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function getRandomItem(array) {
    const randomIndex = Math.floor(Math.random() * array.length);
    return array.splice(randomIndex, 1)[0];
} 

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

export function resetScores(team) {
    team.scores.attackers    = { attacking: 0, possession: 0, passing: 0, defense: 0 };
    team.scores.midfielders  = { attacking: 0, possession: 0, passing: 0, defense: 0 };
    team.scores.defenders    = { attacking: 0, possession: 0, passing: 0, defense: 0 };
    team.scores.keeper       = { passing: 0, keeping: 0 };
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

    // Fallback mapping for secondary position assignments
    const fallbackOrder = {
        "Centre Forward":       ["Left Wing", "Right Wing"],
        "Left Wing":            ["Right Wing", "Centre Forward"],
        "Right Wing":           ["Left Wing", "Centre Forward"],
        "Left-Mid":             ["Left Wing", "Central Midfield", "Centre Forward"],
        "Right-Mid":            ["Right Wing", "Central Midfield", "Centre Forward"],
        "Central Midfield":     ["Attacking Midfield", "Defensive Midfield"],
        "Attacking Midfield":   ["Central Midfield", "Left Wing", "Right Wing", "Centre Forward"],
        "Defensive Midfield":   ["Centre Back", "Central Midfield", "Left Back", "Right Back"],
        "Centre Back":          ["Left Back", "Right Back"],
        "Left Back":            ["Right Back", "Centre Back"],
        "Right Back":           ["Left Back", "Centre Back"]
      };

    // Helper: attempt a fallback assignment for a specified position
    const getFallbackPlayer = pos => {
        for (const alt of (fallbackOrder[pos] || [])) {
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