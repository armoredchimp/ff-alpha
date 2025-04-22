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

export function populateLineup(team) {
    const selected = team.selected;
    const usedIds = new Set();

    // 1) gather all players from all groups
    const allPlayers = Object.keys(selected).flatMap((g) => team[g] || []);

    // 2) find an exact match by detailed_position not yet used
    const getAvailablePlayer = (players, detailedPosition) =>
      players.find((p) => p.detailed_position === detailedPosition && !usedIds.has(p.id));

    // 3) map of fallback positions
    const fallbackOrder = {
      "Centre Forward": ["Left Wing", "Right Wing"],
      "Left Wing": ["Right Wing","Centre Forward"],
      "Right Wing": ["Left Wing","Centre Forward"],
      "Left-Mid": ["Left Wing", "Central Midfield", "Centre Forward"],
      "Right-Mid": ["Right Wing", "Central Midfield", "Centre Forward"],
      "Central Midfield": ["Attacking Midfield", "Defensive Midfield"],
      "Attacking Midfield": ["Central Midfield", "Left Wing", "Right Wing", "Centre Forward"],
      "Defensive Midfield": ["Centre Back", "Central Midfield", "Left Back", "Right Back"],
      "Centre Back": ["Left Back", "Right Back"],
      "Left Back": ["Right Back","Centre Back"],
      "Right Back": ["Left Back","Centre Back"]
    };

    // 4) find a fallback player from allPlayers
    const getFallbackPlayer = (pos) => {
      for (const alt of fallbackOrder[pos] || []) {
        const player = getAvailablePlayer(allPlayers, alt);
        if (player) return player;
      }
      return null;
    };

    // 5) fill each position up to its max
    for (const group of Object.keys(selected)) {
      const groupPlayers = team[group] || [];
      for (const pos in selected[group]) {
        const { max } = selected[group][pos];
        const picked = [];
        for (let i = 0; i < max; i++) {
          // try exact match first
          const exact = getAvailablePlayer(groupPlayers, pos);
          if (exact) {
            picked.push(exact);
            usedIds.add(exact.id);
            continue;
          }
          // then try fallback from any group
          const fb = getFallbackPlayer(pos);
          if (fb) {
            picked.push(fb);
            usedIds.add(fb.id);
          }
        }
        selected[group][pos].players = picked;
      }
    }
    team.unused = allPlayers.filter((p) => !usedIds.has(p.id));
  }