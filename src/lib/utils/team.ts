import { type Team, type Player } from "$lib/types/types";

const positionGroups = ['attackers', 'midfielders', 'defenders', 'keepers'] as const;

export function playerName(): string {
    const name = prompt("Please enter a name for your team:");
    if (name !== null) {
        return name;
    }
    return '';
}

export function parseTeamIdMap(parsedData: any): Record<string, any> {
    if (Array.isArray(parsedData)) {
        // Skip the first element (index 0) which contains a strange object likely from a serialization issue
        // Start from index 1 and create the correct mapping
        const teamIdMap: Record<string, any> = {};
       
        for (let i = 1; i < parsedData.length; i++) {
            teamIdMap[(i - 1).toString()] = parsedData[i];
        }
       
        return teamIdMap;
    }
   
    return parsedData;
}

export function resetScores(team: Team): void {
    team.scores.attackers    = { attacking: 0, possession: 0, passing: 0, defense: 0 };
    team.scores.midfielders  = { attacking: 0, possession: 0, passing: 0, defense: 0 };
    team.scores.defenders    = { attacking: 0, possession: 0, passing: 0, defense: 0 };
    team.scores.keeper       = { passing: 0, keeping: 0 };
}

export function calculateTotalScores(team: Team): void {
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
        const players = team[group as keyof Team] as (Player | number)[] || [];
       
        // For each player in the group, add their scores to the total
        players.forEach(player => {
            // Type guard to check if player is actually a Player object
            if (typeof player !== 'number' && player && 'attacking_score' in player) {
                const p = player as Player;
                if (p.attacking_score) {
                    team.scores.total.attacking += p.attacking_score;
                }
                if (p.defensive_score) {
                    team.scores.total.defense += p.defensive_score;
                }
                if (p.possession_score) {
                    team.scores.total.possession += p.possession_score;
                }
                if (p.passing_score) {
                    team.scores.total.passing += p.passing_score;
                }
                if (p.keeper_score) {
                    team.scores.total.keeping += p.keeper_score;
                }
            }
        });
    });
}

// Define a type for the position data structure
interface PositionData {
    players: (Player | null)[];
    max?: number;
    zone?: number;
}

export function recalculateSectionScores(team: Team): void {
    resetScores(team);
    // Iterate through selected which has variable structure depending on formation,
    // find all player objects and add their scores to appropriate section
    positionGroups.forEach(group => {
        if(team.selected && team.selected[group]) {
            Object.values(team.selected[group]).forEach((p: unknown) => {
                // Type guard to check if p has the expected structure
                if (p && typeof p === 'object' && 'players' in p) {
                    const posData = p as PositionData;
                    if(posData.players && Array.isArray(posData.players)) {
                        posData.players.forEach(player => {
                            if (player && typeof player !== 'number') {
                                const scoreKey = group === 'keepers' ? 'keeper' : group;
                                if (team.scores[scoreKey as keyof typeof team.scores]) {
                                    if (player.detailed_position === 'Goalkeeper') {
                                        team.scores.keeper.passing += player.passing_score || 0;
                                        team.scores.keeper.keeping += player.keeper_score || 0;
                                    } else {
                                        const section = team.scores[scoreKey as 'attackers' | 'midfielders' | 'defenders'];
                                        if ('attacking' in section) {
                                            section.attacking += player.attacking_score || 0;
                                            section.defense += player.defensive_score || 0;
                                            section.possession += player.possession_score || 0;
                                            section.passing += player.passing_score || 0;
                                        }
                                    }
                                }
                            }
                        });
                    }
                }
            });
        }
    });
}