import { teams, playerTeam } from "$lib/stores/teams.svelte";
import { teamIdsToName } from "$lib/stores/generic.svelte";
import { type Team, type Player } from "$lib/types/types";


const positionGroups = ['attackers', 'midfielders', 'defenders', 'keepers'] as const;

export function playerName(): string {
    const name = prompt("Please enter a name for your team:");
    if (name !== null) {
        return name;
    }
    return '';
}

export function populateTeamIdsToName() {
    for (const team of Object.values(teams)) {
        teamIdsToName[team.dbId] = team.name
    }
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
    team.scores.attackers = { finishing: 0, attacking: 0, possession: 0, passing: 0, defense: 0 };
    team.scores.midfielders = { finishing: 0, attacking: 0, possession: 0, passing: 0, defense: 0 };
    team.scores.defenders = { finishing: 0, attacking: 0, possession: 0, passing: 0, defense: 0 };
    team.scores.keeper = { passing: 0, keeping: 0 };
}

export function calculateTotalScores(team: Team): void {
    // Reset total scores to 0
    team.scores.total = {
        finishing: 0,
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
                if (p.finishing_score) {
                    team.scores.total.finishing += p.finishing_score;
                }

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
        if (team.selected && team.selected[group]) {
            Object.values(team.selected[group]).forEach((p: unknown) => {
                // Type guard to check if p has the expected structure
                if (p && typeof p === 'object' && 'players' in p) {
                    const posData = p as PositionData;
                    if (posData.players && Array.isArray(posData.players)) {
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
                                            section.finishing += player.finishing_score || 0;
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

export function getPlayersFromGroup(team: Team, group: string): Player[] {
    const players: Player[] = [];

    if (!team.selected || !team.selected[group]) {
        return players;
    }

    // Iterate through all positions in the group (e.g., 'LW', 'ST', 'RW' for attackers)
    Object.values(team.selected[group]).forEach((positionData: unknown) => {
        // Type guard to check if positionData has the expected structure
        if (positionData && typeof positionData === 'object' && 'players' in positionData) {
            const posData = positionData as PositionData;
            if (posData.players && Array.isArray(posData.players)) {
                posData.players.forEach(player => {
                    // Only add actual Player objects (not nulls or numbers)
                    if (player && typeof player !== 'number' && 'player_name' in player) {
                        players.push(player as Player);
                    }
                });
            }
        }
    });

    return players;
}

export function getDilutionFactor(playerCount) {
    if (playerCount <= 1) return 1;
    return Math.max(0.1, 1 - (playerCount - 1) * 0.1);
}

export function getGroupScoresWithDilution(team, group, playerCount) {
    if (!team.scores) return {};

    const dilutionFactor = getDilutionFactor(playerCount);

    const groupMap = {
        'attackers': team.scores.attackers,
        'midfielders': team.scores.midfielders,
        'defenders': team.scores.defenders,
        'keepers': team.scores.keeper
    };

    const baseScores = groupMap[group] || {};
    const dilutedScores = {};

    Object.keys(baseScores).forEach(key => {
        dilutedScores[key] = baseScores[key] * dilutionFactor;
    });

    return dilutedScores;
}

export function calculateGroupMatchup(team, opponent, group, opponentMode) {
    const opponentGroup = getOpponentGroup(group, opponentMode);
    if (!opponentGroup) return null;

    const teamPlayers = getPlayersFromGroup(team, group);
    const opponentPlayers = getPlayersFromGroup(opponent, opponentGroup);

    const teamScores = getGroupScoresWithDilution(team, group, teamPlayers.length);
    const opponentScores = getGroupScoresWithDilution(opponent, opponentGroup, opponentPlayers.length);

    // Calculate total difference for background color
    let totalDifference = 0;
    let scoreCount = 0;

    Object.keys(teamScores).forEach(key => {
        const teamValue = teamScores[key] || 0;
        const opponentValue = opponentScores[key] || 0;
        totalDifference += (teamValue - opponentValue);
        scoreCount++;
    });

    return scoreCount > 0 ? totalDifference / scoreCount : 0;
}

export function getOpponentGroup(group, mode) {
    if (mode === 0) {
        return group;
    } else {
        switch (group) {
            case 'keepers':
                return null;
            case 'attackers':
                return 'defenders';
            case 'defenders':
                return 'attackers';
            case 'midfielders':
                return 'midfielders';
            default:
                return group;
        }
    }
}

export function getGroupStrengthColor(difference) {
    if (Math.abs(difference) < 5) return 'transparent';

    // Set the base color for positive and negative differences (blue and red).
    const color = difference > 0 ? '59, 130, 246' : '239, 68, 68';

    const opacity = Math.min(Math.abs(difference) / 100 * 0.4, 0.4);

    return `rgba(${color}, ${opacity})`;
}

export function getOpponentTeam(opponentId: number) {
    if (opponentId === -1) return null;
    if (opponentId === 0) return playerTeam;
    return teams[`team${opponentId}`];
}

export function getOpponentName(opponentId: number): string {
    const opponent = getOpponentTeam(opponentId);
    return opponent?.name || 'No Opponent';
}

export function getPossessionPercentage(currTeam: number, opp: number): number {
    const total = currTeam + opp;
    if (total === 0) return 50;
    const rawRatio = currTeam / total;
    const centered = rawRatio - 0.5;
    const compressed = Math.tanh(centered * 2.5) * 0.5;
    let percentage = 50 + (compressed * 44);
    const totalCap = 25;
    if (total < totalCap) {
        const dampening = total / totalCap;
        percentage = 50 + (percentage - 50) * dampening;
    }
    return Math.max(28, Math.min(72, Math.round(percentage)));
}

export function getPossessionColor(percentage: number): string {
    const t = Math.max(0, Math.min(1, (percentage - 28) / (72 - 28)));
    let r: number, g: number, b: number;
    if (t < 0.5) {
        const s = t / 0.5;
        r = Math.round(153 + (202 - 153) * s);
        g = Math.round(27 + (138 - 27) * s);
        b = Math.round(4 + (4 - 27) * s);
    } else {
        const s = (t - 0.5) / 0.5;
        r = Math.round(202 + (22 - 202) * s);
        g = Math.round(138 + (163 - 138) * s);
        b = Math.round(4 + (74 - 4) * s);
    }
    return `rgb(${r}, ${g}, ${b})`;
}