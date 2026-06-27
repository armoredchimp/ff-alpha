import { traitsEffectsCache, doubleNameFirsts, singleNameFirsts, usedSecondParts } from "$lib/stores/draft.svelte";
import { formationConfig } from "$lib/data/formationConfig";

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

export function calculatePer90(statValue, minutes) {
    return minutes > 0 ? ((statValue / minutes) * 90).toFixed(2) : 0;
}


export function condenseString(str) {
    return str.replace(/\s/g, '');
}


export function assignDraftOrder(numberPool) {
    console.log('numb', numberPool)
    if (numberPool.length === 0) {
        return null;
    }
    
    const randomIndex = Math.floor(Math.random() * numberPool.length);
    return numberPool.splice(randomIndex, 1)[0];
}

export function organizeDraftOrder(playerTeam, teams, totalTeams) {
    // Get only the teams that should be active (team1 through team[totalTeams-1])
    const activeTeamEntries = Object.entries(teams)
        .filter(([key, team]) => {
            const teamNumber = parseInt(key.replace('team', ''));
            return teamNumber < totalTeams && team.name !== ''; // Only include initialized teams
        });
    
    const allTeams = [
        { id: 'player', ...playerTeam },
        ...activeTeamEntries.map(([key, team]) => ({ id: key, ...team }))
    ];

    // Sort by draft order
    allTeams.sort((a, b) => a.draftOrder - b.draftOrder);

    // Create snake draft order
    const fullDraftOrder = [];
    const teamCount = allTeams.length;
    
    for (let round = 0; round < totalTeams + 1; round++) {
        if (round % 2 === 0) {
            // Forward order
            allTeams.forEach((team, index) => {
                fullDraftOrder.push({
                    ...team,
                    round: round + 1,
                    pick: index + 1,
                    overallPick: round * teamCount + index + 1
                });
            });
        } else {
            // Reverse order
            [...allTeams].reverse().forEach((team, index) => {
                fullDraftOrder.push({
                    ...team,
                    round: round + 1,
                    pick: index + 1,
                    overallPick: round * teamCount + index + 1
                });
            });
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


export const getTraitEffects = (traits = []) => {
        const traitsKey = JSON.stringify([...traits].sort());
        if (traitsEffectsCache.has(traitsKey)) {
            return traitsEffectsCache.get(traitsKey);
        }

        const traitSet = new Set(traits);
        const effects = {
            defensive: traitSet.has('Favors Defense'),
            attacking: traitSet.has('Favors Attacking'),
            passing: traitSet.has('Strong Passing'),
            pressure: traitSet.has('High Pressure'),
            wingPlay: traitSet.has('Wing Play'),
            aggressive: traitSet.has('Aggressive Tackling'),
            youth: traitSet.has('Youth Focus'),
            experience: traitSet.has('Favors Experience'),
            teamwork: traitSet.has('Teamwork Focus'),
            setPiece: traitSet.has('Set Piece Specialists'),
        };

        traitsEffectsCache.set(traitsKey, effects);
        return effects;
};

export function getPlayerValue(index, player, traits) {
        const position = player.position;
        const isWinger = player.detailed_position === "Right Wing" || player.detailed_position === "Left Wing"
        let score = 0;

        score += index < 5 ?
            Math.floor(Math.random() * 3) + 8 :
            index < 10 ?
            Math.floor(Math.random() * 4) + 4 :
            Math.floor(Math.random() * 3) + 1;

        if (getTraitEffects(traits).defensive && player.tackles_per90 && player.ints_per90) {
            if (position === 'Defender') {
                score += 2
            }
            score += (player.tackles_per90 * 0.4) + (player.ints_per90 * 0.3)
        }

        if (getTraitEffects(traits).passing && player.key_passes_per90) {
            const passingMultiplier = position === 'Midfielder' ? 1.2 : 0.8;
            score += player.key_passes_per90 * passingMultiplier
        }

        if (getTraitEffects(traits).pressure && player.tackles_per90 && player.ints_per90 && player.fouls_per90) {
            score += (player.tackles_per90 * 0.6) + (player.ints_per90 * 0.5) - (player.fouls_per90 * 0.2)
        }

        if (getTraitEffects(traits).attacking && player.goals_per90 && player.assists_per90) {
            let attackingMultiplier = position === 'Attacker' ? 1.4 : position === 'Midfielder' ? 1.2 : 1;
            score += (player.goals_per90 * attackingMultiplier) + (player.assists_per90 * 0.5)
        }

        if (getTraitEffects(traits).wingPlay && player.accurate_crosses_per90 && player.successful_dribbles_per90) {
            if (isWinger)
                score += 1
            if (position === 'Midfielder') {
                score += (player.accurate_crosses_per90 * 1.3) + (player.successful_dribbles_per90 * 0.8);
            } else if (position === 'Attacker' || position === 'Forward') {
                score += (player.accurate_crosses_per90 * 1.5) + (player.successful_dribbles_per90 * 1.0);
            } else {
                score += (player.accurate_crosses_per90 * 1.0) + (player.successful_dribbles_per90 * 0.6);
            }
        }

        // if (getTraitEffects(traits).aggressive && player.fouls_per90 && player.yellow_cards_per90 && player.red_cards_per90) {
        //     score += (player.fouls_per90 * 1.0) + (player.yellow_cards_per90 * 0.5) + (player.red_cards_per90 * 2.0);
        // }

        if (getTraitEffects(traits).youth && player.player_age) {
            let ageScore = 0;
            if (player.player_age >= 18 && player.player_age <= 21) {
                ageScore = 5;
            } else {
                const distanceFromIdeal = player.player_age < 18 ? 18 - player.player_age : player.player_age - 21;
                ageScore = Math.max(-3, 5 - (distanceFromIdeal * 0.5));
            }
            score += ageScore;
        }

        if (getTraitEffects(traits).experience && player.player_age) {
            let ageScore = 0;
            if (player.player_age >= 28 && player.player_age <= 32) {
                ageScore = 5;
            } else {
                const distanceFromIdeal = player.player_age < 28 ? 28 - player.player_age : player.player_age - 32;
                ageScore = Math.max(-3, 5 - (distanceFromIdeal * 0.5));
            }
            score += ageScore;
        }

        // if (getTraitEffects(traits).teamwork && player.assists_per90 && player.passes_completed_percentage && player.yellow_cards_per90 && player.red_cards_per90 && player.goals_per90) {
        //     score -= (player.red_cards_per90 * 2) + (player.yellow_cards_per90 * 0.5);
        //     score += (player.assists_per90 * 1.2) + (player.passes_completed_percentage * 0.4);
        //     if (player.goals_per90 > player.assists_per90 * 2) {
        //         score -= (player.goals_per90 - player.assists_per90 * 2) * 0.3;
        //     }
        // }

        if (getTraitEffects(traits).setPiece && player.assists_per90 && player.goals_per90) {
            if (position === 'Midfielder') {
                score += player.assists_per90 * 1.5;
            } else if (position === 'Defender') {
                score += player.goals_per90 * 2.0;
            } else {
                score += (player.goals_per90 * 1.0) + (player.assists_per90 * 1.0);
            }
        }

        return score;
}

export function getPositionalNeeds(team, traits) {
        const GROUP_TO_POSITION = {
            keepers: 'Goalkeeper',
            defenders: 'Defender',
            midfielders: 'Midfielder',
            attackers: 'Attacker'
        };

        const config = formationConfig[team.formation];

        // posTargets keyed by capitalized position to match executePick's player.position
        const posTargets = config.reduce((acc, [group, ...positions]) => {
            const key = GROUP_TO_POSITION[group];        // 'keepers'→'Goalkeeper', etc.
            acc[key] = positions.reduce((sum, [, max]) => sum + max, 0);
            return acc;
        }, {});

        const positionsCount = {
            Goalkeeper: team.keepers.length,
            Defender: team.defenders.length,
            Midfielder: team.midfielders.length,
            Attacker: team.attackers.length,
        };

        const allTargetsMet = Object.entries(posTargets).every(
            ([pos, target]) => positionsCount[pos] >= target
        );
        if (allTargetsMet) {
            return Object.fromEntries(Object.keys(posTargets).map(pos => [pos, 1]));
        }

        const traitEffects = getTraitEffects(traits);
        return {
            Goalkeeper: positionsCount.Goalkeeper >= posTargets.Goalkeeper ? -15
                : positionsCount.Goalkeeper === 0 ? 30
                : positionsCount.Goalkeeper === 1 ? 2 : 0,
            Defender: positionsCount.Defender >= posTargets.Defender ? -15
                : (posTargets.Defender - positionsCount.Defender) * (traitEffects.defensive ? 3 : 2),
            Midfielder: positionsCount.Midfielder >= posTargets.Midfielder ? -15
                : (posTargets.Midfielder - positionsCount.Midfielder) * 2,
            Attacker: positionsCount.Attacker >= posTargets.Attacker ? -15
                : (posTargets.Attacker - positionsCount.Attacker) * (traitEffects.attacking ? 3 : 2),
        };
}
