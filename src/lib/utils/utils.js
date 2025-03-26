let singleNameFirsts = new Map();  // Track count of first names used alone
let doubleNameFirsts = new Map();  // Track count of first names used in combinations
let usedSecondParts = new Set();


////////////////////
//Draft Functions//
export function generateClubName(firstParts, commonNames, secondParts) {
    const isDoubleName = Math.random() < 0.8; // 4/5 chance for double name
    
    if (isDoubleName) {
        // Get available first parts (not used alone and used <2 times in combinations)
        const availableFirsts = firstParts.filter(name => 
            !singleNameFirsts.has(name) && 
            (doubleNameFirsts.get(name) || 0) < 2
        );
        
        const firstPart = availableFirsts[Math.floor(Math.random() * availableFirsts.length)];
        doubleNameFirsts.set(firstPart, (doubleNameFirsts.get(firstPart) || 0) + 1);
        
        // For second part, either use common name or unused second part
        let secondPart;
        // 0.4 chance for common name
        if (Math.random() < 0.4) {
            secondPart = commonNames[Math.floor(Math.random() * commonNames.length)];
        } else {
            const availableSeconds = secondParts.filter(name => !usedSecondParts.has(name));
            secondPart = availableSeconds[Math.floor(Math.random() * availableSeconds.length)];
            usedSecondParts.add(secondPart);
        }
        
        return `${firstPart} ${secondPart}`;
        
    } else {
        // Get available first parts (not used in combinations and used <2 times alone)
        const availableFirsts = firstParts.filter(name => 
            !doubleNameFirsts.has(name) && 
            (singleNameFirsts.get(name) || 0) < 2
        );
        
        const firstPart = availableFirsts[Math.floor(Math.random() * availableFirsts.length)];
        singleNameFirsts.set(firstPart, (singleNameFirsts.get(firstPart) || 0) + 1);
        
        return firstPart;
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

export function playerName() {
    const name = prompt("Please enter a name for your team:");
    if (name !== null) {
        return name;
    }
    return '';
}
////////////////////
//Generic Utils////
export function formatStatKey(stat) {
    // Insert underscores before capital letters (except the first character) and make the string lowercase
    const formattedStat = stat.replace(/([A-Z])/g, '_$1').toLowerCase();

    // Add 'avg_' at the beginning and ensure no double underscores
    return `avg_${formattedStat.replace(/^_/, '').replace(/__/g, '_')}`;
}