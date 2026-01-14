    // RNG for chance point variance, otherwise intervals would have same # of chance points always
    const VARIANCE_CONFIG = {
        weights: [1, 2, 5, 10, 20, 30, 20, 10, 5, 2, 1],  
        modifiers: [-3, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 3],  
        minPoints: 0  
    };
    
    export function applyVariance(basePoints) {
        const { weights, modifiers, minPoints } = VARIANCE_CONFIG;
        
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        let roll = Math.random() * totalWeight;
        
        let selectedModifier = 0;
        for (let i = 0; i < weights.length; i++) {
            roll -= weights[i];
            if (roll <= 0) {
                selectedModifier = modifiers[i];
                break;
            }
        }
        
        const finalPoints = Math.max(minPoints, Math.round(basePoints + selectedModifier));
        return { finalPoints, modifier: selectedModifier };
    }

    export function getPlayersFromSource(source, side, groupScores, zoneScores, posGroupOrganization, zoneOrganization) {
        const sideKey = side === 'home' ? 'homePlayers' : 'awayPlayers';
        const adjacentKey = side === 'home' ? 'homeAdjacentPlayers' : 'awayAdjacentPlayers';

        if (source.startsWith('group_')) {
            const groupName = source.replace('group_', '');
            return posGroupOrganization[groupName]?.[sideKey] || [];
        } else if (source.startsWith('zone_')) {
            const zoneNum = source.replace('zone_', '');
            const directPlayers = zoneOrganization[zoneNum]?.[sideKey] || [];
            if (directPlayers.length > 0) return directPlayers;
            return zoneOrganization[zoneNum]?.[adjacentKey] || [];
        }
        return [];
    }

    export function selectRandomPlayer(players) {
        if (!players || players.length === 0) return null;
        return players[Math.floor(Math.random() * players.length)];
    }

    export function getUniqueMinute(baseMinute, existingGoals) {
        const takenMinutes = existingGoals.map(g => g.minute);
        let exactMinute;
        do {
            exactMinute = baseMinute + Math.floor(Math.random() * 10);
        } while (takenMinutes.includes(exactMinute));
        return exactMinute;
    }