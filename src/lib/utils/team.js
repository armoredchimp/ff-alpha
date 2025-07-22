const positionGroups = ['attackers', 'midfielders', 'defenders', 'keepers'];

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

export function calculateTotalScores(team) {
    // Reset total scores to 0
    team.scores.total = {
        attacking: 0,
        defense: 0,
        possession: 0,
        passing: 0,
        keeping: 0
    };
    
    // Iterate through each position group
    positionGroups.forEach(group => {
        const players = team[group] || [];
        
        // For each player in the group, add their scores to the total
        players.forEach(player => {
            if (player.attacking_score) {
                team.scores.total.attacking += player.attacking_score;
            }
            if (player.defensive_score) {
                team.scores.total.defense += player.defensive_score;
            }
            if (player.possession_score) {
                team.scores.total.possession += player.possession_score;
            }
            if (player.passing_score) {
                team.scores.total.passing += player.passing_score;
            }
            if (player.keeper_score) {
                team.scores.total.keeping += player.keeper_score;
            }
        });
    });
}

export function recalculateSectionScores(team) {
    resetScores(team);

    // Iterate through selected which has variable structure depending on formation, 
    // find all player objects and add their scores to appropriate section
    positionGroups.forEach(group => {
        if(team.selected[group]) {
            Object.values(team.selected[group]).forEach(p=>{
                if(p.players && Array.isArray(p.players)) {
                    p.players.forEach(player => {
                        if (player) {
                            const scoreKey = group === 'keepers' ? 'keeper' : group;
                            if (team.scores[scoreKey]) {
                                if (player.detailed_position === 'Goalkeeper') {
                                    team.scores.keeper.passing += player.passing_score || 0;
                                    team.scores.keeper.keeping += player.keeper_score || 0;
                                } else {
                                    team.scores[scoreKey].attacking += player.attacking_score || 0;
                                    team.scores[scoreKey].defense += player.defensive_score || 0;
                                    team.scores[scoreKey].possession += player.possession_score || 0;
                                    team.scores[scoreKey].passing += player.passing_score || 0;
                                }
                            }
                        }
                    })
                }
            } )
        }
    })
}