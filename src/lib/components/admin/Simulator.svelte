<script lang="ts">
    import { onMount } from "svelte";
    import { zoneMatchups, zoneAdjacency } from "$lib/utils/formation";
    import { applyVariance } from "$lib/utils/sim"

    let {
        scoreMap = new Map(),
        leagueMatchups = [],
        leagueId = 0,
    } = $props<{
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
    // Objects for stateful group and zone scores. Changes upon a player swap 
    let groupScores = $state({});
    let zoneScores = $state({});
    
    let matchResults = $state({});

    onMount(() => {
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

        const chancePoints = simulateMatch(groupScores);
        matchResults[matchupId] = chancePoints;

        return {
            matchupId,
            status: 'simulated',
            posGroupOrganization,
            zoneOrganization,
            chancePoints
        };
    }

    function simulateMatch(scores) {
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
            
            // Tally group points
            Object.keys(GROUP_MATCHUPS).forEach(group => {
                matchChancePoints.home.byGroup[group] += intervalResult.home[group];
                matchChancePoints.away.byGroup[group] += intervalResult.away[group];
                matchChancePoints.home.total += intervalResult.home[group];
                matchChancePoints.away.total += intervalResult.away[group];
            });
            
            // Tally zone points
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
        return matchChancePoints;
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