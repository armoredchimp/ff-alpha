<script lang="ts">
    import { onMount } from "svelte";
    import { zoneMatchups, zoneAdjacency } from "$lib/utils/formation";
    import { applyVariance } from "$lib/utils/sim"

    let {
        playersMap = {},
        scoreMap = new Map(),
        leagueMatchups = [],
        leagueId = 0,
    } = $props<{
        playersMap?: Record<number, any>;
        scoreMap?: Map<number, any>;
        leagueMatchups?: Array<any>;
        leagueId?: number;
    }>();
    
    const MATCH_INTERVALS = [0, 10, 20, 30, 40, 50, 60, 70, 80];
  
    // Positional Group weights and values for chance point calculation
    const CHANCE_THRESHOLDS = [
        { min: 8000, bonus: 4 },
        { min: 4500, bonus: 3 },
        { min: 2000, bonus: 2 },
        { min: 1000, bonus: 1 }
    ];
    const POS_THRESHOLDS = [
        { min: 14000, bonus: 4 },
        { min: 9500, bonus: 3 },
        { min: 4000, bonus: 2 },
        { min: 2000, bonus: 1 }
    ]
    const GROUP_MATCHUPS = {
        defenders: 'attackers',
        midfielders: 'midfielders',
        attackers: 'defenders'
    };
    // Zonal weights and values for chance point calculation
    const ZONE_ADJ_SCORE = .35;
    const ZONE_CHANCE_THRESHOLDS = [
        { min: 2000, bonus: 3 },
        { min: 1000, bonus: 2 },
        { min: 500, bonus: 1 }
    ];
    const ZONE_POS_THRESHOLDS = [
        { min: 10000, bonus: 2 },
        { min: 6000, bonus: 1 }
    ];

    const SCORING_CONFIG = {
        baseChance: 4,
        
        finishingScale: 1400,
        finishingMaxBonus: 5,
        
        keeperScale: 2000,
        keeperMaxPenalty: 4,
        
        defenseMultiplier: 0.6,
        defenseScale: 7500,
        defenseMaxPenalty: 2,
        
        midfieldMultiplier: 0.3,
        midfieldScale: 5000,
        midfieldMaxPenalty: 1,
        
        minimumChance: 0.3,
        
        goalPenalties: [0, 0, 0, 0, 1, 2.5, 4.5, 7, 11]
    };

    const ASSIST_CONFIG = {
        soloChance: 0.20,
        
        groupLinks: {
            defenders: ['midfielders'],
            midfielders: ['attackers', 'defenders'],
            attackers: ['midfielders']
        }
    };
    // Objects for stateful group and zone scores. Changes upon a player swap 
    let groupScores = $state({});
    let zoneScores = $state({});
    
    let matchResults = $state({});

    onMount(() => {
        console.log('playersMap contents:', playersMap);
        console.log('playersMap size:', Object.keys(playersMap).length);
        if (leagueMatchups.length > 0 && scoreMap.size > 0) {
            simulateMatchups();
        }
        if (leagueMatchups.length > 0 && scoreMap.size > 0) {
            simulateMatchups();
        }
    });

    // Simulate whole league
    function simulateMatchups() {
        console.log(`\n========================================`);
        console.log(`SIMULATING LEAGUE ${leagueId}`);
        console.log(`Total matchups to process: ${leagueMatchups.length}`);
        console.log(`========================================\n`);
        
        leagueMatchups.forEach((matchup, index) => {
            console.log(`\n--- Matchup ${index + 1}/${leagueMatchups.length} ---`);
            console.log(`Matchup ID: ${matchup.matchupId}`);
            console.log(`Home Team: ${matchup.homeTeam.teamId}`);
            console.log(`Away Team: ${matchup.awayTeam.teamId}`);
            
            const result = simulateMatchup(matchup);
            
            if (result) {
                console.log(`Result processed for matchup ${matchup.matchupId}`);
            }
        });
        
        console.log(`\n✅ Completed simulation for League ${leagueId}\n`);
    }
    
    // Simulate individual game
    function simulateMatchup(matchup) {
        const { homeTeam, awayTeam, matchupId } = matchup;

        console.log('\nHome Team Roster:');
        console.log('Selected players:', homeTeam.selected);
        console.log('Subs:', homeTeam.subs);

        console.log('\nAway Team Roster:');
        console.log('Selected players:', awayTeam.selected);
        console.log('Subs:', awayTeam.subs);

        const posGroupOrganization = organizePlayersByGroup(homeTeam.selected, awayTeam.selected);
        const zoneOrganization = organizePlayersByZones(homeTeam.selected, awayTeam.selected);
        console.log('\nPositional Groups Organization:', posGroupOrganization);
        console.log('\nZone Organization:', zoneOrganization);

        scoreGroups(posGroupOrganization);
        scoreZones(zoneOrganization);

        const matchResult = simulateMatch(groupScores, posGroupOrganization, zoneOrganization);
        matchResults[matchupId] = matchResult;

        return {
            matchupId,
            status: 'simulated',
            posGroupOrganization,
            zoneOrganization,
            ...matchResult
        };
    }

    function simulateMatch(scores, posGroupOrganization, zoneOrganization) {
        const matchChancePoints = {
            home: {
                total: 0,
                byGroup: { defenders: 0, midfielders: 0, attackers: 0 },
                byZone: {},
                byInterval: []
            },
            away: {
                total: 0,
                byGroup: { defenders: 0, midfielders: 0, attackers: 0 },
                byZone: {},
                byInterval: []
            }
        };

        MATCH_INTERVALS.forEach(minute => {
            const intervalResult = processInterval(scores, minute);
            const zoneIntervalResult = processZoneInterval(zoneScores, minute);
            
            matchChancePoints.home.byInterval.push({ minute, groups: intervalResult.home, zones: zoneIntervalResult.home });
            matchChancePoints.away.byInterval.push({ minute, groups: intervalResult.away, zones: zoneIntervalResult.away });
            
            Object.keys(GROUP_MATCHUPS).forEach(group => {
                matchChancePoints.home.byGroup[group] += intervalResult.home[group];
                matchChancePoints.away.byGroup[group] += intervalResult.away[group];
                matchChancePoints.home.total += intervalResult.home[group];
                matchChancePoints.away.total += intervalResult.away[group];
            });
            
            Object.keys(zoneIntervalResult.home).forEach(zoneNum => {
                if (!matchChancePoints.home.byZone[zoneNum]) matchChancePoints.home.byZone[zoneNum] = 0;
                matchChancePoints.home.byZone[zoneNum] += zoneIntervalResult.home[zoneNum];
                matchChancePoints.home.total += zoneIntervalResult.home[zoneNum];
            });
            Object.keys(zoneIntervalResult.away).forEach(zoneNum => {
                if (!matchChancePoints.away.byZone[zoneNum]) matchChancePoints.away.byZone[zoneNum] = 0;
                matchChancePoints.away.byZone[zoneNum] += zoneIntervalResult.away[zoneNum];
                matchChancePoints.away.total += zoneIntervalResult.away[zoneNum];
            });
        });

        console.log('\nMatch Chance Points:', JSON.stringify(matchChancePoints, null, 2));
        
        const scoringResults = runScoringChecks(matchChancePoints, groupScores, zoneScores, posGroupOrganization, zoneOrganization);
        
        return {
            chancePoints: matchChancePoints,
            score: {
                home: scoringResults.home.goals,
                away: scoringResults.away.goals
            },
            goalDetails: {
                home: scoringResults.home.goalDetails,
                away: scoringResults.away.goalDetails
            }
        };
    }

    function processInterval(scores, minute) {
        const result = {
            home: { defenders: 0, midfielders: 0, attackers: 0 },
            away: { defenders: 0, midfielders: 0, attackers: 0 }
        };

        console.log(`\n=== Interval ${minute}-${minute + 10} ===`);

        Object.keys(GROUP_MATCHUPS).forEach(attackingGroup => {
            const defendingGroup = GROUP_MATCHUPS[attackingGroup];

            const homeChecks = calculatePossessionChecks(
                scores[attackingGroup]?.homeScores,
                scores[defendingGroup]?.awayScores
            );
            const awayChecks = calculatePossessionChecks(
                scores[attackingGroup]?.awayScores,
                scores[defendingGroup]?.homeScores
            );

            for (let i = 0; i < homeChecks; i++) {
                result.home[attackingGroup] += calculateGroupChancePoints(
                    scores[attackingGroup]?.homeScores,
                    scores[defendingGroup]?.awayScores,
                    'Home',
                    attackingGroup,
                    defendingGroup,
                    i + 1,
                    homeChecks
                );
            }
            
            for (let i = 0; i < awayChecks; i++) {
                result.away[attackingGroup] += calculateGroupChancePoints(
                    scores[attackingGroup]?.awayScores,
                    scores[defendingGroup]?.homeScores,
                    'Away',
                    attackingGroup,
                    defendingGroup,
                    i + 1,
                    awayChecks
                );
            }
        });

        return result;
    }

    function getPlayersFromSource(source, side, groupScores, zoneScores, posGroupOrganization, zoneOrganization) {
        const sideKey = side === 'home' ? 'homePlayers' : 'awayPlayers';
        const adjacentKey = side === 'home' ? 'homeAdjacentPlayers' : 'awayAdjacentPlayers';

        if (source.startsWith('group_')) {
            const groupName = source.replace('group_', '');
            return posGroupOrganization[groupName]?.[sideKey] || [];
        } else if (source.startsWith('zone_')) {
            const zoneNum = source.replace('zone_', '');
            const directPlayers = zoneOrganization[zoneNum]?.[sideKey] || [];
            if (directPlayers.length > 0) return directPlayers;
            // Fallback to adjacent players if no direct players
            return zoneOrganization[zoneNum]?.[adjacentKey] || [];
        }
        return [];
    }

    function selectRandomPlayer(players) {
        if (!players || players.length === 0) return null;
        return players[Math.floor(Math.random() * players.length)];
    }

    function calculatePossessionChecks(attackingScores, defendingScores) {
        const atkPossession = attackingScores?.possession_score || 0;
        const defPossession = defendingScores?.possession_score || 0;
        const differential = atkPossession - defPossession;

        let extraChecks = 0;
        for (const threshold of POS_THRESHOLDS) {
            if (differential >= threshold.min) {
                extraChecks = threshold.bonus;
                break;
            }
        }

        return 1 + extraChecks;
    }

    function calculateGroupChancePoints(attackingScores, defendingScores, team, atkGroup, defGroup, checkNum, totalChecks) {
        const baseOffense = attackingScores 
            ? ((attackingScores.attacking_score || 0) * 0.8) + 
            ((attackingScores.passing_score || 0) * 0.8 )+ 
            ((attackingScores.possession_score || 0) / 4) 
            : 0;
        
        const offense = baseOffense / 8
        const defense = defendingScores?.defensive_score || 0;
        const differential = offense - defense;

        let bonus = 0;
        for (const threshold of CHANCE_THRESHOLDS) {
            if (differential >= threshold.min) {
                bonus = threshold.bonus;
                break;
            }
        }

        const basePoints = 1 + bonus;
        const { finalPoints, modifier } = applyVariance(basePoints);

        const modStr = modifier >= 0 ? `+${modifier}` : `${modifier}`;
        console.log(`  ${team} ${atkGroup} vs ${defGroup} [${checkNum}/${totalChecks}]: base=${basePoints} (${modStr}) → ${finalPoints} pts`);

        return finalPoints;
    }


    function processZoneInterval(zoneScores, minute) {
        const result = { home: {}, away: {} };
        
        console.log(`\n=== Zone Interval ${minute}-${minute + 10} ===`);
        
        Object.keys(zoneScores).forEach(zoneNum => {
            const zone = zoneScores[zoneNum];
            if (!zone) return;
            
            result.home[zoneNum] = 0;
            result.away[zoneNum] = 0;
            
            // Home attacking this zone
            const homeChecks = calculateZonePossessionChecks(
                zone.homeScores,
                zone.awayScores
            );
            
            for (let i = 0; i < homeChecks; i++) {
                result.home[zoneNum] += calculateZoneChancePoints(
                    zone.homeScores,
                    zone.awayScores,
                    'Home',
                    zoneNum,
                    i + 1,
                    homeChecks
                );
            }
            
            // Away attacking this zone
            const awayChecks = calculateZonePossessionChecks(
                zone.awayScores,
                zone.homeScores
            );
            
            for (let i = 0; i < awayChecks; i++) {
                result.away[zoneNum] += calculateZoneChancePoints(
                    zone.awayScores,
                    zone.homeScores,
                    'Away',
                    zoneNum,
                    i + 1,
                    awayChecks
                );
            }
        });
        
        return result;
    }

    function calculateZonePossessionChecks(attackingScores, defendingScores) {
        const atkPossession = attackingScores?.possession_score || 0;
        const defPossession = defendingScores?.possession_score || 0;
        const differential = atkPossession - defPossession;
        
        let extraChecks = 0;
        for (const threshold of ZONE_POS_THRESHOLDS) {
            if (differential >= threshold.min) {
                extraChecks = threshold.bonus;
                break;
            }
        }
        
        // Minimum default one check per zone
        return extraChecks + 1;
    }

    function calculateZoneChancePoints(attackingScores, defendingScores, team, zoneNum, checkNum, totalChecks) {
        const baseOffense = attackingScores 
            ? ((attackingScores.attacking_score || 0) *0.9) + 
            ((attackingScores.passing_score || 0) *0.9) + 
            ((attackingScores.possession_score || 0) / 4) 
            : 0;
        
        const offense = baseOffense * 0.9;
        const defense = defendingScores?.defensive_score || 0;
        const differential = offense - defense;
        
        let bonus = 0;
        for (const threshold of ZONE_CHANCE_THRESHOLDS) {
            if (differential >= threshold.min) {
                bonus = threshold.bonus;
                break;
            }
        }
        
        // No base point for zones - only bonus if threshold met
        if (bonus === 0) return 0;
        
        const { finalPoints, modifier } = applyVariance(bonus);
        
        const modStr = modifier >= 0 ? `+${modifier}` : `${modifier}`;
        console.log(`  ${team} Zone ${zoneNum} [${checkNum}/${totalChecks}]: base=${bonus} (${modStr}) → ${finalPoints} pts`);
        
        return finalPoints;
    }

    // ============================================
    // SCORING CHECK FUNCTIONS
    // ============================================

    function runScoringChecks(matchChancePoints, groupScores, zoneScores, posGroupOrganization, zoneOrganization) {
        const results = {
            home: { goals: 0, goalDetails: [] },
            away: { goals: 0, goalDetails: [] }
        };

        const homeDefense = {
            keeper:groupScores.keepers?.homeScores?.keeper_score || 0,
            defenseTotal: groupScores.defenders?.homeScores?.defensive_score || 0,
            midfieldDefense: groupScores.midfielders?.homeScores?.defensive_score || 0
        };

        const awayDefense = {
            keeper: groupScores.keepers?.awayScores?.keeper_score || 0,
            defenseTotal: groupScores.defenders?.awayScores?.defensive_score || 0,
            midfieldDefense: groupScores.midfielders?.awayScores?.defensive_score || 0
        };

        console.log('\n========== SCORING CHECKS ==========');
        console.log('Home defensive stats:', homeDefense);
        console.log('Away defensive stats:', awayDefense);

        matchChancePoints.home.byInterval.forEach((interval) => {
            const homeGoals = processIntervalScoringChecks(
                interval,
                'home',
                groupScores,
                zoneScores,
                awayDefense,
                results.home.goals,
                posGroupOrganization,
                zoneOrganization
            );
            
            results.home.goals += homeGoals.goals;
            results.home.goalDetails.push(...homeGoals.goalDetails);
        });

        matchChancePoints.away.byInterval.forEach((interval) => {
            const awayGoals = processIntervalScoringChecks(
                interval,
                'away',
                groupScores,
                zoneScores,
                homeDefense,
                results.away.goals,
                posGroupOrganization,
                zoneOrganization
            );
            
            results.away.goals += awayGoals.goals;
            results.away.goalDetails.push(...awayGoals.goalDetails);
        });

        // Enhanced final summary
        console.log(`\n========== FINAL SCORE ==========`);
        console.log(`Home ${results.home.goals} - ${results.away.goals} Away`);

        if (results.home.goalDetails.length > 0) {
            console.log('\nHome Goals:');
            results.home.goalDetails.forEach(g => {
                console.log(`  ${g.minute}' - ${g.scorerName} (${g.type} from ${g.finisher})`);
            });
        }

        if (results.away.goalDetails.length > 0) {
            console.log('\nAway Goals:');
            results.away.goalDetails.forEach(g => {
                console.log(`  ${g.minute}' - ${g.scorerName} (${g.type} from ${g.finisher})`);
            });
        }

        return results;
    }

    function processIntervalScoringChecks(intervalData, side, groupScores, zoneScores, opponentDefense, goalsAlreadyScored, posGroupOrganization, zoneOrganization) {
        const { minute, groups, zones } = intervalData;
        
        const sources = {};
        
        Object.entries(groups).forEach(([group, points]) => {
            if (points > 0) {
                sources[`group_${group}`] = { points };
            }
        });
        
        Object.entries(zones).forEach(([zone, points]) => {
            if (points > 0) {
                sources[`zone_${zone}`] = { points };
            }
        });
        
        const totalPoints = Object.values(sources).reduce((sum, s) => sum + s.points, 0);
        if (totalPoints === 0) return { goals: 0, goalDetails: [] };
        
        const totalChecks = 1 + Math.floor((totalPoints - 1) / 3);
        const checks = distributeChecksToSources(sources, totalChecks);
        
        let goals = 0;
        const goalDetails = [];
        
        console.log(`\n--- ${side.toUpperCase()} Minute ${minute}: ${totalPoints} chance pts → ${totalChecks} checks ---`);
        
        checks.forEach((check, idx) => {
            const finisherInfo = determineFinisher(check.source, side, groupScores, zoneScores);
            
            // Get the actual player who finished
            const finisherSource = finisherInfo.finisher || finisherInfo.source;
            const finisherPlayers = getPlayersFromSource(finisherSource, side, groupScores, zoneScores, posGroupOrganization, zoneOrganization);
            const scorerPlayerId = selectRandomPlayer(finisherPlayers);
            
            const result = runScoringCheck(
                finisherInfo.finishingScore,
                opponentDefense.keeper,
                opponentDefense.defenseTotal,
                opponentDefense.midfieldDefense,
                goalsAlreadyScored + goals
            );

            const playerName = playersMap[scorerPlayerId]?.player_name || `Unknown (${scorerPlayerId})`;
            const status = result.scored ? `⚽ GOAL! (${playerName})` : 'saved';
            const assistInfo = finisherInfo.type === 'assisted' 
                ? ` (${finisherInfo.creator} → ${finisherInfo.finisher})`
                : ` (${finisherInfo.type})`;
            
            console.log(`  Check ${idx + 1} [${check.source}]${assistInfo}: ${result.roll} vs ${result.target}% → ${status}`);
            
            if (result.scored) {
                goals++;
                goalDetails.push({
                    minute,
                    scorerPlayerId,
                    scorerName: playersMap[scorerPlayerId]?.player_name || 'Unknown',
                    creator: finisherInfo.creator || finisherInfo.source,
                    finisher: finisherInfo.finisher || finisherInfo.source,
                    type: finisherInfo.type,
                    finishingScore: finisherInfo.finishingScore,
                    roll: result.roll,
                    chance: result.target
                });
            }
        });
        
        return { goals, goalDetails };
    }

    function distributeChecksToSources(sources, totalChecks) {
        const checks = [];
        const sourceList = Object.entries(sources);
        const totalPoints = sourceList.reduce((sum, [_, s]) => sum + s.points, 0);
        
        let checksAssigned = 0;
        
        sourceList.forEach(([sourceName, sourceData], index) => {
            let checksForSource;
            
            if (index === sourceList.length - 1) {
                checksForSource = totalChecks - checksAssigned;
            } else {
                checksForSource = Math.round((sourceData.points / totalPoints) * totalChecks);
            }
            
            checksForSource = Math.max(0, checksForSource);
            
            for (let i = 0; i < checksForSource; i++) {
                checks.push({ source: sourceName });
            }
            
            checksAssigned += checksForSource;
        });
        
        return checks;
    }

    function determineFinisher(source, side, groupScores, zoneScores) {
        const scoreKey = side === 'home' ? 'homeScores' : 'awayScores';
        
        if (Math.random() < ASSIST_CONFIG.soloChance) {
            return {
                type: 'solo',
                source: source,
                finishingScore: getSourceFinishing(source, scoreKey, groupScores, zoneScores)
            };
        }
        
        let linkedSources = [];
        
        if (source.startsWith('group_')) {
            const groupName = source.replace('group_', '');
            const links = ASSIST_CONFIG.groupLinks[groupName] || [];
            linkedSources = links.map(g => `group_${g}`);
        } else if (source.startsWith('zone_')) {
            const zoneNum = parseInt(source.replace('zone_', ''));
            const adjacentZones = zoneAdjacency[zoneNum] || [];
            linkedSources = adjacentZones.map(z => `zone_${z}`);
        }
        
        linkedSources = linkedSources.filter(ls => {
            const score = getSourceFinishing(ls, scoreKey, groupScores, zoneScores);
            return score !== null && score !== undefined;
        });
        
        if (linkedSources.length === 0) {
            return {
                type: 'solo_fallback',
                source: source,
                finishingScore: getSourceFinishing(source, scoreKey, groupScores, zoneScores)
            };
        }
        
        const finisher = linkedSources[Math.floor(Math.random() * linkedSources.length)];
        
        return {
            type: 'assisted',
            creator: source,
            finisher: finisher,
            finishingScore: getSourceFinishing(finisher, scoreKey, groupScores, zoneScores)
        };
    }

    function getSourceFinishing(source, scoreKey, groupScores, zoneScores) {
        if (source.startsWith('group_')) {
            const groupName = source.replace('group_', '');
            return groupScores[groupName]?.[scoreKey]?.finishing_score || 0;
        } else if (source.startsWith('zone_')) {
            const zoneNum = source.replace('zone_', '');
            return zoneScores[zoneNum]?.[scoreKey]?.finishing_score || 0;
        }
        return 0;
    }

    function runScoringCheck(finishingScore, keeperScore, defenseTotal, midfieldDefense, goalsAlreadyScored) {
        const { 
            baseChance, 
            finishingScale, finishingMaxBonus,
            keeperScale, keeperMaxPenalty,
            defenseMultiplier, defenseScale, defenseMaxPenalty,
            midfieldMultiplier, midfieldScale, midfieldMaxPenalty,
            minimumChance,
            goalPenalties
        } = SCORING_CONFIG;
        
        const finishingBonus = Math.min(finishingMaxBonus, finishingScore / finishingScale);
        const keeperPenalty = Math.min(keeperMaxPenalty, keeperScore / keeperScale);
        const adjustedDefense = defenseTotal * defenseMultiplier;
        const defensePenalty = Math.min(defenseMaxPenalty, adjustedDefense / defenseScale);
        const adjustedMidfield = midfieldDefense * midfieldMultiplier;
        const midfieldPenalty = Math.min(midfieldMaxPenalty, adjustedMidfield / midfieldScale);
        const goalPenalty = goalPenalties[Math.min(goalsAlreadyScored, goalPenalties.length - 1)];
        
        let chance = baseChance + finishingBonus - keeperPenalty - defensePenalty - midfieldPenalty - goalPenalty;
        chance = Math.max(minimumChance, chance);
        
        const roll = Math.random() * 100;
        const scored = roll < chance;
        
        return {
            roll: roll.toFixed(2),
            target: chance.toFixed(2),
            scored
        };
    }



    function scoreZones(zoneOrg) {
        Object.keys(zoneOrg).forEach(zoneNum => {
            const zone = zoneOrg[zoneNum];
            console.log(`Processing zone ${zoneNum}`);
            if (Number(zoneNum) === 1 || Number(zoneNum) > 17) return;
            
            if (!zoneScores[zoneNum]) {
                zoneScores[zoneNum] = {
                    homeScores: {
                        attacking_score: 0,
                        finishing_score: 0,
                        passing_score: 0,
                        possession_score: 0,
                        defensive_score: 0
                    },
                    awayScores: {
                        attacking_score: 0,
                        finishing_score: 0,
                        passing_score: 0,
                        possession_score: 0,
                        defensive_score: 0
                    }
                };
            }
            
            const home = zoneScores[zoneNum].homeScores;
            const away = zoneScores[zoneNum].awayScores;
            
            const groupConfigs = [
                { groupName: 'homePlayers', target: home, multiplier: 1 },
                { groupName: 'homeAdjacentPlayers', target: home, multiplier: ZONE_ADJ_SCORE },
                { groupName: 'awayPlayers', target: away, multiplier: 1 },
                { groupName: 'awayAdjacentPlayers', target: away, multiplier: ZONE_ADJ_SCORE }
            ];
            
            groupConfigs.forEach(config => {
                const players = zone[config.groupName];
                if (players && Array.isArray(players)) {
                    for (let i = 0; i < players.length; i++) {
                        const playerId = players[i];
                        const scores = scoreMap.get(playerId);
                        if (scores) {
                            Object.keys(config.target).forEach(scoreType => {
                                if (scores[scoreType] !== undefined && scores[scoreType] !== null) {
                                    config.target[scoreType] += scores[scoreType] * config.multiplier * .1;
                                    config.target[scoreType] = Math.round(config.target[scoreType]);
                                }
                            });
                        }
                    }
                }
            });
        });

        console.log(`Scored zones: ${JSON.stringify(zoneScores, null, 2)}`);
    }

    function scoreGroups(groupOrg) {
        Object.keys(groupOrg).forEach(groupName => {
            const group = groupOrg[groupName];
            
            console.log(`\nProcessing ${groupName}:`);
            console.log(`  Home players: ${group.homePlayers.length} players - IDs: ${group.homePlayers}`);
            console.log(`  Away players: ${group.awayPlayers.length} players - IDs: ${group.awayPlayers}`);
        
            if (groupName !== 'keepers') {
                groupScores[groupName] = {
                    homeScores: {
                        attacking_score: 0,
                        finishing_score: 0,
                        passing_score: 0,
                        possession_score: 0,
                        defensive_score: 0
                    },
                    awayScores: {
                        attacking_score: 0,
                        finishing_score: 0,
                        passing_score: 0,
                        possession_score: 0,
                        defensive_score: 0
                    }
                };
            } else {
                groupScores['keepers'] = {
                    homeScores: { keeper_score: 0, passing_score: 0 },
                    awayScores: { keeper_score: 0, passing_score: 0 }
                };
            }
            
            let home = groupScores[groupName].homeScores;
            let away = groupScores[groupName].awayScores;
            
            for (let i = 0; i < group.homePlayers.length; i++) {
                const playerId = group.homePlayers[i];
                const scores = scoreMap.get(playerId);
                console.log(`    Home Player ${playerId} scores:`, scores);
                if (scores) {
                    Object.keys(home).forEach(scoreType => {
                        if (scores[scoreType] !== undefined && scores[scoreType] !== null) {
                            home[scoreType] += scores[scoreType];
                        }
                    });
                }
            }
            
            for (let i = 0; i < group.awayPlayers.length; i++) {
                const playerId = group.awayPlayers[i];
                const scores = scoreMap.get(playerId); 
                console.log(`    Away Player ${playerId} scores:`, scores);
                if (scores) {
                    Object.keys(away).forEach(scoreType => {
                        if (scores[scoreType] !== undefined && scores[scoreType] !== null) {
                            away[scoreType] += scores[scoreType];
                        }
                    });
                }
            }
        });
        
        console.log('Group Scores:');
        console.log(JSON.stringify(groupScores, null, 2));
    }

    function organizePlayersByGroup(homeSelected, awaySelected) {
        const homePlayersByGroup = extractPlayersByGroup(homeSelected);
        const awayPlayersByGroup = extractPlayersByGroup(awaySelected);

        console.log('Home players by group:', homePlayersByGroup);
        console.log('Away players by group:', awayPlayersByGroup);

        const groupOrg = {};

        Object.keys(homePlayersByGroup).forEach(group => {
            groupOrg[group] = {
                homePlayers: homePlayersByGroup[group],
                awayPlayers: awayPlayersByGroup[group]
            };
        });

        return groupOrg;
    }
    
    function organizePlayersByZones(homeSelected, awaySelected) {
        const homePlayersByZone = extractPlayersByZone(homeSelected);
        const awayPlayersByZone = extractPlayersByZone(awaySelected);
        
        console.log('Home players by zone:', homePlayersByZone);
        console.log('Away players by zone:', awayPlayersByZone);
        
        const zoneOrg = {};
        
        for (let zone = 3; zone <= 17; zone++) {
            const homePlayersInZone = homePlayersByZone[zone] || [];
            const awayPlayersInZone = awayPlayersByZone[zone] || [];
            
            const opposingZone = zoneMatchups[zone];
            const opposingPlayers = opposingZone ? (awayPlayersByZone[opposingZone] || []) : [];
            
            const adjacentZones = zoneAdjacency[zone] || [];
            const homeAdjacentPlayers = [];
            const awayAdjacentPlayers = [];
            
            adjacentZones.forEach(adjZone => {
                if (homePlayersByZone[adjZone]) {
                    homeAdjacentPlayers.push(...homePlayersByZone[adjZone]);
                }
                
                const opposingAdjZone = zoneMatchups[adjZone];
                if (opposingAdjZone && awayPlayersByZone[opposingAdjZone]) {
                    awayAdjacentPlayers.push(...awayPlayersByZone[opposingAdjZone]);
                }
            });
            
            if (homePlayersInZone.length > 0 || homeAdjacentPlayers.length > 0 || 
                opposingPlayers.length > 0 || awayAdjacentPlayers.length > 0) {
                zoneOrg[zone] = {
                    homePlayers: homePlayersInZone,
                    homeAdjacentPlayers: homeAdjacentPlayers,
                    awayPlayers: opposingPlayers,
                    awayAdjacentPlayers: awayAdjacentPlayers
                };
            }
        }
        
        return zoneOrg;
    }

    function extractPlayersByGroup(selected) {
        const playersByGroup = {};

        Object.keys(selected).forEach(positionGroup => {
            playersByGroup[positionGroup] = [];
            const group = selected[positionGroup];
            Object.keys(group).forEach(position => {
                const positionData = group[position];
                const players = positionData.players || [];
                playersByGroup[positionGroup].push(...players);
            });
        });
        return playersByGroup;
    }

    function extractPlayersByZone(selected) {
        const playersByZone = {};
        
        Object.keys(selected).forEach(positionGroup => {
            if (positionGroup === 'keepers') return;
            
            const group = selected[positionGroup];
            
            Object.keys(group).forEach(position => {
                const positionData = group[position];
                const zone = positionData.zone;
                const players = positionData.players || [];
                
                if (zone && zone > 2) {
                    if (!playersByZone[zone]) {
                        playersByZone[zone] = [];
                    }
                    playersByZone[zone].push(...players);
                }
            });
        });
        
        return playersByZone;
    }
</script>