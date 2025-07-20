export function playerName() {
    const name = prompt("Please enter a name for your team:");
    if (name !== null) {
        return name;
    }
    return '';
}

export function parseTeamIdMap(parsedData) {
    if (Array.isArray(parsedData)) {
        // Skip the first element (index 0) which contains a strange object likely from a serialization issue 
        // Start from index 1 and create the correct mapping
        const teamIdMap = {};
        
        for (let i = 1; i < parsedData.length; i++) {
            teamIdMap[(i - 1).toString()] = parsedData[i];
        }
        
        return teamIdMap;
    }
    
    return parsedData;
}

export function resetScores(team) {
    team.scores.attackers    = { attacking: 0, possession: 0, passing: 0, defense: 0 };
    team.scores.midfielders  = { attacking: 0, possession: 0, passing: 0, defense: 0 };
    team.scores.defenders    = { attacking: 0, possession: 0, passing: 0, defense: 0 };
    team.scores.keeper       = { passing: 0, keeping: 0 };
}