<script>
    import { supabase } from "$lib/client/supabase/supaClient";
    import { defenseWeightMap, passingWeightMap, possessionWeightMap, attackingWeightMap, keepingWeightMap, finishingWeightMap, defenseImpMap, passingImpMap, possessionImpMap, attackingImpMap, keepingImpMap, finishingImpMap } from "$lib/stores/generic.svelte";
    import { TABLE_PREFIXES, LEAGUE_MAX_GAMES } from "$lib/stores/league.svelte";
    import { onMount } from 'svelte';
    
    let weightsFetched = false;
    
    
    let matchweeksLoaded = false;
    let isRunning = false;
    let currentLeague = '';
    let overallProgress = 0;
    let leagueProgress = 0;
    let logs = [];
    let leagueResults = {};

    const MIN_MINUTES_FOR_VALID_PER90 = 360;
    
    // Adjustment to reflect difference between leagues, prem == 100%
    const leagueStrengthWeights = {
        'prem': 1.0,
        'laliga': 0.9,
        'bundes': 0.8,
        'seriea': 0.7,
        'ligue1': 0.7
    };

    // Individual matchweeks for each league
    let matchweeks = {
        prem: 1,
        laliga: 1,
        bundes: 1,
        seriea: 1,
        ligue1: 1
    };


    onMount(async () => {
        await fetchMatchweeks();
    });
    
    async function fetchMatchweeks() {
        try {
            const { data, error } = await supabase
                .from('league_info_reference')
                .select('country_code, current_matchweek, league_string');
            
            if (error) {
                console.error('Error fetching matchweeks:', error);
                addLog('Error fetching matchweeks from database', 'error');
                return;
            }
            
            if (data && data.length > 0) {
                data.forEach(row => {
                    const league = TABLE_PREFIXES[row.country_code];
                    if (league && row.current_matchweek !== null) {
                        matchweeks[league] = row.current_matchweek;
                    }
                });
                matchweeksLoaded = true;
                addLog('Matchweeks loaded from database successfully');
            } else {
                addLog('No matchweeks found in database', 'error');
            }
        } catch (err) {
            console.error('Error in fetchMatchweeks:', err);
            addLog('Failed to load matchweeks', 'error');
        }
    }

    // Helper function to calculate importance
    function calculateImportance(weight) {
        if (weight >= 0) {
            if (weight < 100) return 1;
            if (weight < 200) return 2;
            if (weight < 300) return 3;
            if (weight < 500) return 4;
            return 5;
        } else {
            if (weight > -100) return -1;
            if (weight > -200) return -2;
            if (weight > -300) return -3;
            if (weight > -500) return -4;
            return -5;
        }
    }
    
    // Fetch weights from database
    async function getWeightsFromTable(tableName, weightMap, impMap){
        const { data, error } = await supabase
            .from(tableName)
            .select('*');

        if (error) {
            console.error(`Error fetching weights from ${tableName}`)
            return null;
        }
        
        data.forEach(row => {
            const weights = Object.keys(row).reduce((acc, key) => {
                if (key !== 'Position') {
                    acc[key] = row[key];
                }
                return acc;
            }, {});

            weightMap[row.Position] = weights;

            const importances = {};
            Object.keys(weights).forEach(stat => {
                importances[stat] = calculateImportance(weights[stat]);
            });
            impMap[row.Position] = importances;
        });
    }

    async function fetchAllWeights(){
        await Promise.all([
            getWeightsFromTable('getDefensiveScore', defenseWeightMap, defenseImpMap),
            getWeightsFromTable('getKeeperScore', keepingWeightMap, keepingImpMap),
            getWeightsFromTable('getPossessionScore', possessionWeightMap, possessionImpMap),
            getWeightsFromTable('getPassingScore', passingWeightMap, passingImpMap),
            getWeightsFromTable('getAttackingScore', attackingWeightMap, attackingImpMap),
            getWeightsFromTable('getFinishingScore', finishingWeightMap, finishingImpMap )
        ])

        weightsFetched = true;
    }
    
    // Main orchestrator function
    async function runAllLeagueScoring(currentSeason = '2526', lastSeason = '2425', matchweeksInput) {
        addLog('=== STARTING CROSS-SEASON SCORING FOR ALL LEAGUES ===');
        
        // Step 1: Fetch weights once for all leagues
        addLog('Fetching weights...');
        await fetchAllWeights();
        if (!weightsFetched) {
            addLog('Failed to fetch weights - aborting', 'error');
            return;
        }
        
        // League configuration
        const leagues = ['prem', 'laliga', 'bundes', 'seriea', 'ligue1'];
        const leagueIdMap = {
            23744: 'bundes', 23621: 'laliga', 23643: 'ligue1', 23614: 'prem', 23746: 'seriea',
            25646: 'bundes', 25659: 'laliga', 25651: 'ligue1', 25583: 'prem', 25533: 'seriea'
        };
        
        // Step 2: Load player season log once for all leagues
        addLog('Loading player season log...');
        const { data: seasonLogData, error: seasonLogError } = await supabase
            .from('player_season_log')
            .select('*');
        
        if (seasonLogError) {
            addLog('Error loading season log: ' + seasonLogError.message, 'error');
            return;
        }
        
        const playerSeasonMap = new Map();
        for (const player of seasonLogData) {
            playerSeasonMap.set(player.id, {
                lastSeasonLeague: player[lastSeason],
                currentSeasonLeague: player[currentSeason],
                playerName: player['Player Name']
            });
        }
        addLog(`Loaded season data for ${playerSeasonMap.size} players`);
        
        // Step 3: Pre-load ALL per90 tables (current and last season)
        addLog('Pre-loading all per90 data...');
        
        // Current season per90 data
        const currentSeasonPer90Data = new Map();
        for (const league of leagues) {
            const tableName = `${league}_stats_${currentSeason}_per90`;
            addLog(`Loading current season: ${tableName}`);
            
            const { data, error } = await supabase
                .from(tableName)
                .select('*');
            
            if (!error && data) {
                currentSeasonPer90Data.set(league, data);
                addLog(`Loaded ${data.length} players from ${league} current season`);
            }
        }
        
        // Last season per90 data
        const lastSeasonPer90Data = new Map();
        for (const league of leagues) {
            const tableName = `${league}_stats_${lastSeason}_per90`;
            addLog(`Loading last season: ${tableName}`);
            
            const { data, error } = await supabase
                .from(tableName)
                .select('*');
            
            if (!error && data) {
                // Store by player ID for quick lookup
                for (const player of data) {
                    lastSeasonPer90Data.set(player.id, {
                        league: league,
                        data: player
                    });
                }
                addLog(`Loaded ${data.length} players from ${league} last season`);
            }
        }
        
        // Step 4: Load average minutes for each league from last season
        addLog('Loading league average minutes...');
        const leagueAverageMinutes = {};
        
        for (const league of leagues) {
            const avgView = `${league}_${lastSeason}_outfield_per90_averages`;
            const { data, error } = await supabase
                .from(avgView)
                .select('avg_minutes_played')
                .single();
            
            if (!error && data) {
                leagueAverageMinutes[league] = {
                    avg: data.avg_minutes_played,
                    minRange: data.avg_minutes_played - 100,
                    maxRange: data.avg_minutes_played + 100
                };
                addLog(`${league} average: ${data.avg_minutes_played.toFixed(0)}`);
            }
        }
        
        // Step 5: Process each league with its specific matchweek
        const results = {};
        
        for (let i = 0; i < leagues.length; i++) {
            const league = leagues[i];
            currentLeague = league.toUpperCase();
            overallProgress = (i / leagues.length) * 100;
            
            addLog(`\n=== Processing ${league.toUpperCase()} (Matchweek ${matchweeksInput[league]}) ===`);
            
            const leagueResult = await calculateCrossSeasonScores(
                league,
                currentSeason,
                lastSeason,
                matchweeksInput[league],
                {
                    currentSeasonPlayers: currentSeasonPer90Data.get(league),
                    lastSeasonPer90Data: lastSeasonPer90Data,
                    playerSeasonMap: playerSeasonMap,
                    leagueAverageMinutes: leagueAverageMinutes,
                    leagueIdMap: leagueIdMap
                }
            );
            
            results[league] = leagueResult;
            leagueResults[league] = leagueResult;
        }
        
        // Final summary
        overallProgress = 100;
        addLog('\n=== ALL LEAGUES COMPLETE ===', 'success');
        for (const [league, result] of Object.entries(results)) {
            addLog(`${league}: Processed ${result.processed}/${result.total}, Failed: ${result.failed}`, 'success');
        }
        
        return results;
    }
    
    // Individual league scoring function
    async function calculateCrossSeasonScores(leagueString, currentSeason, lastSeason, currentMatchweek, preloadedData) {
        addLog(`Starting scoring for ${leagueString}, Matchweek ${currentMatchweek}`);
        
        // Extract preloaded data
        const {
            currentSeasonPlayers,
            lastSeasonPer90Data,
            playerSeasonMap,
            leagueAverageMinutes,
            leagueIdMap
        } = preloadedData;
        
        if (!currentSeasonPlayers || currentSeasonPlayers.length === 0) {
            addLog(`No current season data for ${leagueString}`, 'error');
            return { processed: 0, failed: 0, total: 0 };
        }
        
        // League configuration
        const leagueGames = {
            'prem': 38, 'laliga': 38, 'bundes': 34, 'seriea': 38, 'ligue1': 34
        };
        
        // Calculate season weighting
        const totalGames = leagueGames[leagueString];
        const seasonProgress = currentMatchweek / totalGames;
        const currentSeasonWeight = Math.sqrt(seasonProgress) * 0.95;
        const lastSeasonWeight = 1 - currentSeasonWeight;
        
        addLog(`Weights - Current: ${(currentSeasonWeight * 100).toFixed(1)}%, Last: ${(lastSeasonWeight * 100).toFixed(1)}%`);
        
        // Process each player
        const miniTable = `${leagueString}_mini_${currentSeason}`;
        const scoringResults = [];
        const failedPlayers = [];
        let processedCount = 0;
        
        for (let i = 0; i < currentSeasonPlayers.length; i++) {
            const currentPlayer = currentSeasonPlayers[i];
            
            // Update league progress
            leagueProgress = ((i + 1) / currentSeasonPlayers.length) * 100;
            
            if ((i + 1) % 50 === 0) {
                const percentage = ((i + 1) / currentSeasonPlayers.length * 100).toFixed(1);
                addLog(`Progress: ${i + 1}/${currentSeasonPlayers.length} (${percentage}%)`);
            }
            
            try {
                const playerId = currentPlayer.id;
                const playerName = currentPlayer.PlayerName;
                const position = currentPlayer.Position;
                const detailedPosition = currentPlayer.DetailedPosition;
                const isKeeper = position === 'Goalkeeper';
                
                // if (currentPlayer.MinutesPlayed < 250) {
                //     const minimalData = {
                //         id: playerId,
                //         player_name: playerName,
                //         position: position,
                //         detailed_position: detailedPosition,
                //         keeper_score: 0,
                //         defensive_score: 0,
                //         passing_score: 0,
                //         possession_score: 0,
                //         attacking_score: 0,
                //         finishing_score: 0,
                //         total_score: 0,
                //         transfer_value: 500
                //     };
                //     scoringResults.push(minimalData);
                //     continue;
                // }
                
                // Get season info
                const seasonInfo = playerSeasonMap.get(playerId);
                const lastSeasonPlayer = lastSeasonPer90Data.get(playerId);
                const lastSeasonLeagueString = seasonInfo?.lastSeasonLeague 
                    ? leagueIdMap[seasonInfo.lastSeasonLeague] 
                    : null;
                
                // Calculate minutes adjustment
                let lastSeasonAdjustmentFactor = 1;
                if (lastSeasonPlayer?.data && lastSeasonLeagueString) {
                    const lastSeasonMinutes = lastSeasonPlayer.data.MinutesPlayed || 0; 
                    const leagueAvg = leagueAverageMinutes[lastSeasonLeagueString];
                    
                    if (leagueAvg) {
                        if (lastSeasonMinutes < leagueAvg.minRange) {
                            const minutesBelow = leagueAvg.minRange - lastSeasonMinutes;
                            const percentageBelow = minutesBelow / leagueAvg.avg;
                            lastSeasonAdjustmentFactor = Math.pow(1 - percentageBelow, 2);
                        } else if (lastSeasonMinutes > leagueAvg.maxRange) {
                            const minutesAbove = lastSeasonMinutes - leagueAvg.maxRange;
                            const percentageAbove = minutesAbove / leagueAvg.avg;
                            lastSeasonAdjustmentFactor = 1 + Math.pow(percentageAbove, 2);
                        }
                    }
                }
                
            let currentScores = {};
            let lastScores = {};
            let finalScores = {};
            const maxCurrentMinutes = currentMatchweek * 90;

            const currentLeagueWeight = leagueStrengthWeights[leagueString] || 1.0;
            const lastLeagueWeight = lastSeasonLeagueString 
                ? leagueStrengthWeights[lastSeasonLeagueString] || 1.0 
                : currentLeagueWeight;

            const currentMinutesPlayed = currentPlayer.MinutesPlayed || 0;

            if (!isKeeper) {
                // Score current season
                currentScores = {
                    defensive: scoreDefensive(currentPlayer, detailedPosition),
                    passing: scorePassing(currentPlayer, detailedPosition),
                    possession: scorePossession(currentPlayer, detailedPosition),
                    attacking: scoreAttacking(currentPlayer, detailedPosition),
                    finishing: scoreFinishing(currentPlayer, detailedPosition)
                };
                
                if (currentMinutesPlayed < MIN_MINUTES_FOR_VALID_PER90) {
                    const minutesPenalty = Math.pow(currentMinutesPlayed / MIN_MINUTES_FOR_VALID_PER90, 2);
                    currentScores = {
                        defensive: currentScores.defensive * minutesPenalty * currentLeagueWeight,
                        passing: currentScores.passing * minutesPenalty * currentLeagueWeight,
                        possession: currentScores.possession * minutesPenalty * currentLeagueWeight,
                        attacking: currentScores.attacking * minutesPenalty * currentLeagueWeight,
                        finishing: currentScores.finishing * minutesPenalty * currentLeagueWeight
                    };
                } else {
                    const currentMinutesPercentage = Math.min(currentMinutesPlayed / maxCurrentMinutes, 1);
                    currentScores = {
                        defensive: currentScores.defensive * currentMinutesPercentage * currentLeagueWeight,
                        passing: currentScores.passing * currentMinutesPercentage * currentLeagueWeight,
                        possession: currentScores.possession * currentMinutesPercentage * currentLeagueWeight,
                        attacking: currentScores.attacking * currentMinutesPercentage * currentLeagueWeight,
                        finishing: currentScores.finishing * currentMinutesPercentage * currentLeagueWeight
                    };
                }

                // Score last season with adjustment
                if (lastSeasonPlayer?.data) {
                    const lastSeasonMinutes = lastSeasonPlayer.data.MinutesPlayed || 0;

                    if (lastSeasonMinutes < MIN_MINUTES_FOR_VALID_PER90) {
                        const minutesPenalty = Math.pow(lastSeasonMinutes / MIN_MINUTES_FOR_VALID_PER90, 2);
                        lastScores = {
                            defensive: scoreDefensive(lastSeasonPlayer.data, detailedPosition) * minutesPenalty * lastSeasonAdjustmentFactor * lastLeagueWeight,
                            passing: scorePassing(lastSeasonPlayer.data, detailedPosition) * minutesPenalty * lastSeasonAdjustmentFactor * lastLeagueWeight,
                            possession: scorePossession(lastSeasonPlayer.data, detailedPosition) * minutesPenalty * lastSeasonAdjustmentFactor * lastLeagueWeight,
                            attacking: scoreAttacking(lastSeasonPlayer.data, detailedPosition) * minutesPenalty * lastSeasonAdjustmentFactor * lastLeagueWeight,
                            finishing: scoreFinishing(lastSeasonPlayer.data, detailedPosition) * minutesPenalty * lastSeasonAdjustmentFactor * lastLeagueWeight
                        };
                    } else {
                        lastScores = {
                            defensive: scoreDefensive(lastSeasonPlayer.data, detailedPosition) * lastSeasonAdjustmentFactor * lastLeagueWeight,
                            passing: scorePassing(lastSeasonPlayer.data, detailedPosition) * lastSeasonAdjustmentFactor * lastLeagueWeight,
                            possession: scorePossession(lastSeasonPlayer.data, detailedPosition) * lastSeasonAdjustmentFactor * lastLeagueWeight,
                            attacking: scoreAttacking(lastSeasonPlayer.data, detailedPosition) * lastSeasonAdjustmentFactor * lastLeagueWeight,
                            finishing: scoreFinishing(lastSeasonPlayer.data, detailedPosition) * lastSeasonAdjustmentFactor * lastLeagueWeight
                        };
                    }
                } else {
                    // No last season - use current scores scaled down
                    lastScores = {
                        defensive: currentScores.defensive * 0.2,
                        passing: currentScores.passing * 0.2,
                        possession: currentScores.possession * 0.2,
                        attacking: currentScores.attacking * 0.2,
                        finishing: currentScores.finishing * 0.2
                    };
                }
                
                // Weight and combine
                finalScores = {
                    defensive: (currentScores.defensive * currentSeasonWeight) + (lastScores.defensive * lastSeasonWeight),
                    passing: (currentScores.passing * currentSeasonWeight) + (lastScores.passing * lastSeasonWeight),
                    possession: (currentScores.possession * currentSeasonWeight) + (lastScores.possession * lastSeasonWeight),
                    attacking: (currentScores.attacking * currentSeasonWeight) + (lastScores.attacking * lastSeasonWeight),
                    finishing: (currentScores.finishing * currentSeasonWeight) + (lastScores.finishing * lastSeasonWeight),
                    keeper: 0
                };
                
            } else {
                // Goalkeeper scoring
                currentScores = {
                    keeper: scoreKeeper(currentPlayer, detailedPosition),
                    passing: scorePassing(currentPlayer, detailedPosition)
                };
                
                // Apply minutes penalty for goalkeepers too
                if (currentMinutesPlayed < MIN_MINUTES_FOR_VALID_PER90) {
                    const minutesPenalty = Math.pow(currentMinutesPlayed / MIN_MINUTES_FOR_VALID_PER90, 2);
                    currentScores = {
                        keeper: currentScores.keeper * minutesPenalty * currentLeagueWeight,
                        passing: currentScores.passing * minutesPenalty * currentLeagueWeight
                    };
                } else {
                    const currentMinutesPercentage = Math.min(currentMinutesPlayed / maxCurrentMinutes, 1);
                    currentScores = {
                        keeper: currentScores.keeper * currentMinutesPercentage * currentLeagueWeight,
                        passing: currentScores.passing * currentMinutesPercentage * currentLeagueWeight
                    };
                }

                if (lastSeasonPlayer?.data) {
                    const lastSeasonMinutes = lastSeasonPlayer.data.MinutesPlayed || 0;
                    
                    if (lastSeasonMinutes < MIN_MINUTES_FOR_VALID_PER90) {
                        const minutesPenalty = Math.pow(lastSeasonMinutes / MIN_MINUTES_FOR_VALID_PER90, 2);
                        lastScores = {
                            keeper: scoreKeeper(lastSeasonPlayer.data, detailedPosition) * minutesPenalty * lastSeasonAdjustmentFactor * lastLeagueWeight,
                            passing: scorePassing(lastSeasonPlayer.data, detailedPosition) * minutesPenalty * lastSeasonAdjustmentFactor * lastLeagueWeight
                        };
                    } else {
                        lastScores = {
                            keeper: scoreKeeper(lastSeasonPlayer.data, detailedPosition) * lastSeasonAdjustmentFactor * lastLeagueWeight,
                            passing: scorePassing(lastSeasonPlayer.data, detailedPosition) * lastSeasonAdjustmentFactor * lastLeagueWeight
                        };
                    }
                } else {
                    lastScores = {
                        keeper: currentScores.keeper * 0.2,
                        passing: currentScores.passing * 0.2
                    };
                }
                    
                    finalScores = {
                        keeper: ((currentScores.keeper * currentSeasonWeight) + (lastScores.keeper * lastSeasonWeight)),
                        passing: ((currentScores.passing * currentSeasonWeight) + (lastScores.passing * lastSeasonWeight)),
                        defensive: 0,
                        possession: 0,
                        attacking: 0,
                        finishing: 0
                    };
                }
                
                // Calculate total
                let total = 0;
                if (!isKeeper) {
                    total = finalScores.defensive + finalScores.passing + finalScores.possession + 
                            finalScores.attacking + finalScores.finishing;
                    
                    if (position === 'Midfielder') {
                        total *= 1.05;
                    } else if (detailedPosition === 'Centre-Back') {
                        total *= 1.7;
                    } else if (detailedPosition === 'Left-Back' || detailedPosition === 'Right-Back') {
                        total *= 0.95;
                    }
                    
                    total = (total / 3.2).toFixed(2);
                } else {
                    total = ((finalScores.keeper + finalScores.passing) / 1.9).toFixed(2);
                }
                
                const playerData = {
                    id: playerId,
                    player_name: playerName, 
                    position: position,
                    detailed_position: detailedPosition,
                    keeper_score: finalScores.keeper?.toFixed(2) || null,
                    defensive_score: finalScores.defensive?.toFixed(2) || null,
                    passing_score: finalScores.passing?.toFixed(2) || null,
                    possession_score: finalScores.possession?.toFixed(2) || null,
                    attacking_score: finalScores.attacking?.toFixed(2) || null,
                    finishing_score: finalScores.finishing?.toFixed(2) || null,
                    total_score: parseFloat(total),
                    transfer_value: (parseFloat(total) * 20).toFixed(2)
                };
                
                scoringResults.push(playerData);
                processedCount++;
                
            } catch (err) {
                console.error(`Error processing ${currentPlayer.PlayerName}:`, err);
                failedPlayers.push({
                    id: currentPlayer.id,
                    name: currentPlayer.PlayerName,
                    error: err.message
                });
            }
        }
        
        // Upload results
        addLog(`Uploading ${scoringResults.length} results to ${miniTable}...`);
        
        const batchSize = 500;
        for (let i = 0; i < scoringResults.length; i += batchSize) {
            const batch = scoringResults.slice(i, i + batchSize);
            const { error } = await supabase
                .from(miniTable)
                .upsert(batch, { onConflict: 'id' });
            
            if (error) {
                addLog(`Error uploading batch: ${error.message}`, 'error');
            }
        }
        
        addLog(`${leagueString} complete: ${processedCount} processed, ${failedPlayers.length} failed`);
        
        return {
            processed: processedCount,
            failed: failedPlayers.length,
            total: currentSeasonPlayers.length
        };
    }
    
    // Scoring functions that work directly with per90 data
    function scoreDefensive(per90Data, detailedPosition) {
        const weights = defenseWeightMap[detailedPosition];
        if (!weights) return 0;
        
        let score = 0;
        score += (per90Data.TacklesPer90 || 0) * (weights.TacklesPer90 || 0);
        score += (per90Data.FoulsPer90 || 0) * (weights.FoulsPer90 || 0);
        score += (per90Data.InterceptionsPer90 || 0) * (weights.InterceptionsPer90 || 0);
        score += (per90Data.ClearancesPer90 || 0) * (weights.ClearancesPer90 || 0);
        score += (per90Data.AerialsWonPer90 || 0) * (weights.AerialsWonPer90 || 0);
        score += (per90Data.DuelsWonPercentage || 0) * (weights.DuelsWonPercentage || 0);
        score += (per90Data.Cleansheets || 0) * (weights.Cleansheets || 0);
        score += (per90Data.ErrorLeadToGoal || 0) * (weights.ErrorLeadToGoal || 0);
        score += (per90Data.DribbledPastPer90 || 0) * (weights.DribbledPastPer90 || 0);
        
        score = (score * 0.8);
        return capScore(score);
    }
    
    function scorePassing(per90Data, detailedPosition) {
        const weights = passingWeightMap[detailedPosition];
        if (!weights) return 0;
        
        let score = 0;
        score += (per90Data.BigChancesCreatedPer90 || 0) * (weights.BigChancesCreatedPer90 || 0);
        score += (per90Data.KeyPassesPer90 || 0) * (weights.KeyPassesPer90 || 0);
        score += (per90Data.AccuratePassesPercentage || 0) * (weights.AccuratePassesPercentage || 0);
        score += (per90Data.PassesPer90 || 0) * (weights.PassesPer90 || 0);
        score += (per90Data.AssistsPer90 || 0) * (weights.AssistsPer90 || 0);
        score += (per90Data.AccurateCrossesPer90 || 0) * (weights.AccurateCrossesPer90 || 0);
        score += (per90Data.ThroughBallsPer90 || 0) * (weights.ThroughBallsPer90 || 0);
        
        if (detailedPosition === 'Goalkeeper') {
            score *= 4;
        }
        
        return capScore(score);
    }
    
    function scorePossession(per90Data, detailedPosition) {
        const weights = possessionWeightMap[detailedPosition];
        if (!weights) return 0;
        
        let score = 0;
        score += (per90Data.AccuratePassesPer90 || 0) * (weights.AccuratePassesPer90 || 0);
        score += (per90Data.AccuratePassesPercentage || 0) * (weights.AccuratePassesPercentage || 0);
        score += (per90Data.PassesPer90 || 0) * (weights.PassesPer90 || 0);
        score += (per90Data.SuccessfulDribblesPer90 || 0) * (weights.SuccessfulDribblesPer90 || 0);
        score += (per90Data.DispossessedPer90 || 0) * (weights.DispossessedPer90 || 0);
        score += (per90Data.FoulsPer90 || 0) * (weights.FoulsPer90 || 0);
        score += (per90Data.FoulsDrawnPer90 || 0) * (weights.FoulsDrawnPer90 || 0);
        
        const passAccuracy = per90Data.AccuratePassesPercentage || 0;
        score = (score / 30) * passAccuracy;
        
        if (score <= 100) {
            score = passAccuracy;
        }
        
        return capScore(score);
    }
    
    function scoreAttacking(per90Data, detailedPosition) {
        const weights = attackingWeightMap[detailedPosition];
        if (!weights) return 0;
        
        let score = 0;
        score += (per90Data.AccuratePassesPer90 || 0) * (weights.AccuratePassesPer90 || 0);
        score += (per90Data.AssistsPer90 || 0) * (weights.AssistsPer90 || 0);
        score += (per90Data.BigChancesCreatedPer90 || 0) * (weights.BigChancesCreatedPer90 || 0);
        score += (per90Data.GoalsPer90 || 0) * (weights.GoalsPer90 || 0);
        score += (per90Data.ShotsOnTargetPer90 || 0) * (weights.ShotsOnTargetPer90 || 0);
        score += (per90Data.SuccessfulDribblesPer90 || 0) * (weights.SuccessfulDribblesPer90 || 0);
        score += (per90Data.KeyPassesPer90 || 0) * (weights.KeyPassesPer90 || 0);
        
        score = score * 2;
        return capScore(score);
    }
    
    function scoreFinishing(per90Data, detailedPosition) {
        const weights = finishingWeightMap[detailedPosition];
        if (!weights) return 0;
        
        let score = 0;
        score += (per90Data.BigChancesMissedPer90 || 0) * (weights.BigChancesMissedPer90 || 0);
        score += (per90Data.GoalsPer90 || 0) * (weights.GoalsPer90 || 0);
        score += (per90Data.HitWoodworkPer90 || 0) * (weights.HitWoodworkPer90 || 0);
        score += (per90Data.BlockedShotsPer90 || 0) * (weights.BlockedShotsPer90 || 0);
        score += (per90Data.ShotsOffTargetPer90 || 0) * (weights.ShotsOffTargetPer90 || 0);
        score += (per90Data.ShotsOnTargetPer90 || 0) * (weights.ShotsOnTargetPer90 || 0);
        score += (per90Data.OffsidessPer90 || 0) * (weights.OffsidessPer90 || 0);
        
        score = score * 2;
        return capScore(score);
    }
    
    function scoreKeeper(per90Data, detailedPosition) {
        const weights = keepingWeightMap[detailedPosition];
        if (!weights) return 0;
        
        let score = 0;
        score += (per90Data.AerialsWonPer90 || 0) * (weights.AerialsWonPer90 || 0);
        score += (per90Data.Cleansheets || 0) * (weights.Cleansheets || 0);
        score += (per90Data.ClearancesPer90 || 0) * (weights.ClearancesPer90 || 0);
        score += (per90Data.GoalsConcededPer90 || 0) * (weights.GoalsConcededPer90 || 0);
        score += (per90Data.ErrorLeadToGoal || 0) * (weights.ErrorLeadToGoal || 0);
        score += (per90Data.SavesPer90 || 0) * (weights.SavesPer90 || 0);
        score += (per90Data.SavesInsideboxPer90 || 0) * (weights.SavesInsideBoxPer90 || 0);
        score += (per90Data.DuelsWonPercentage || 0) * (weights.DuelsWonPercentage || 0);
        
        score = (score / 14);
        return capScore(score);
    }
    
    function capScore(score) {
        const maxScore = 5000;
        const minScore = 0;
        
        if (score > maxScore) return maxScore;
        if (score < minScore) return minScore;
        return parseFloat(score.toFixed(2));
    }
    
    // UI helper functions
    function addLog(message, type = 'normal') {
        const time = new Date().toLocaleTimeString();
        logs = [...logs, { time, message, type }];
    }
    
    async function startScoring() {
        // Validate all matchweeks
        if (!matchweeksLoaded) {
            alert('Matchweeks not loaded from database. Please refresh the page.');
            return;
        }

        for (const [league, matchweek] of Object.entries(matchweeks)) {
            const maxGames = LEAGUE_MAX_GAMES[league];
            if (!matchweek || matchweek < 1 || matchweek > maxGames) {
                alert(`Invalid matchweek for ${league.toUpperCase()}: must be between 1 and ${maxGames}`);
                return;
            }
        }
        
        isRunning = true;
        logs = [];
        leagueResults = {};
        
        await runAllLeagueScoring('2526', '2425', matchweeks);
        
        isRunning = false;
    }
</script>

<div class="admin-container">
    <h1>⚽ League Scoring Admin</h1>
    
    <div class="control-panel">
        <div class="matchweek-inputs">
            <h3>Current Matchweeks</h3>
         <div class="matchweek-grid">
            {#each Object.entries(matchweeks) as [league, matchweek]}
                <div class="matchweek-item">
                    <!-- svelte-ignore a11y_label_has_associated_control -->
                    <label>
                        <span class="league-name">{league.toUpperCase()}</span>
                        <span class="max-games">Max: {LEAGUE_MAX_GAMES[league]}</span>
                    </label>
                    <div class="matchweek-display">
                        {#if matchweeksLoaded}
                            {matchweek}
                        {:else}
                            Loading...
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
        </div>
        
        <button 
            on:click={startScoring} 
            disabled={isRunning}
            class="start-button"
        >
            {isRunning ? 'Processing...' : 'Start Scoring'}
        </button>
    </div>
    
    <div class="season-weights">
        <h3>Season Weight Preview</h3>
        <div class="weights-grid">
            {#each Object.entries(matchweeks) as [league, matchweek]}
                {@const totalGames = LEAGUE_MAX_GAMES[league]}
                {@const progress = matchweek / totalGames}
                {@const currentWeight = Math.sqrt(progress) * 0.95}
                {@const lastWeight = 1 - currentWeight}
                <div class="weight-item">
                    <strong>{league.toUpperCase()}</strong>
                    <span>Current: {(currentWeight * 100).toFixed(1)}%</span>
                    <span>Last: {(lastWeight * 100).toFixed(1)}%</span>
                </div>
            {/each}
        </div>
    </div>
    
    <div class="progress-section">
        <div class="progress-item">
            <h3>Overall Progress</h3>
            <div class="progress-bar">
                <div 
                    class="progress-fill overall" 
                    style="width: {overallProgress}%"
                >
                    {overallProgress.toFixed(1)}%
                </div>
            </div>
        </div>
        
        {#if currentLeague}
            <div class="progress-item">
                <h3>Current: {currentLeague}</h3>
                <div class="progress-bar">
                    <div 
                        class="progress-fill league" 
                        style="width: {leagueProgress}%"
                    >
                        {leagueProgress.toFixed(1)}%
                    </div>
                </div>
            </div>
        {/if}
    </div>
    
    {#if Object.keys(leagueResults).length > 0}
        <div class="results-section">
            <h3>Results</h3>
            <table>
                <thead>
                    <tr>
                        <th>League</th>
                        <th>Processed</th>
                        <th>Failed</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {#each Object.entries(leagueResults) as [league, result]}
                        <tr>
                            <td>{league.toUpperCase()}</td>
                            <td>{result.processed}</td>
                            <td>{result.failed}</td>
                            <td>{result.total}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}
    
    <div class="log-section">
        <h3>Logs</h3>
        <div id="log-container" class="log-container">
            {#each logs as log}
                <div class="log-entry">
                    <span class="log-time">[{log.time}]</span>
                    <span class="log-message {log.type}">{log.message}</span>
                </div>
            {/each}
        </div>
    </div>
</div>

<style>
    .admin-container {
        max-width: 1400px;
        margin: 0 auto;
        padding: 2rem;
        font-family: system-ui, -apple-system, sans-serif;
    }
    
    h1 {
        color: #333;
        margin-bottom: 2rem;
    }
    
    .control-panel {
        display: flex;
        gap: 2rem;
        align-items: end;
        margin-bottom: 2rem;
        padding: 1.5rem;
        background: #f5f5f5;
        border-radius: 8px;
    }
    
    .matchweek-inputs {
        flex: 1;
    }
    
    .matchweek-inputs h3 {
        margin-bottom: 1rem;
        color: #555;
    }
    
    .matchweek-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 1rem;
    }
    
    .matchweek-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }
    
   .matchweek-item label {
        display: flex;
        flex-direction: column;
        font-size: 0.9rem;
        font-weight: 600;
        color: #555;
        margin-bottom: 0.25rem;  /* Add this line */
    }
    
    .matchweek-display {
        padding: 0.5rem;
        background: #e9e9e9;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 1rem;
        text-align: center;
        font-weight: 600;
        color: #333;
        min-height: 34px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .max-games {
        font-size: 0.75rem;
        color: #888;
        font-weight: 400;
    }
    
    .start-button {
        padding: 0.75rem 2rem;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.3s;
    }
    
    .start-button:hover:not(:disabled) {
        background: #45a049;
    }
    
    .start-button:disabled {
        background: #ccc;
        cursor: not-allowed;
    }
    
    .season-weights {
        margin-bottom: 2rem;
        padding: 1rem;
        background: #f9f9f9;
        border-radius: 8px;
    }
    
    .season-weights h3 {
        margin-bottom: 1rem;
        color: #555;
    }
    
    .weights-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 1rem;
    }
    
    .weight-item {
        display: flex;
        flex-direction: column;
        padding: 0.5rem;
        background: white;
        border-radius: 4px;
        font-size: 0.9rem;
    }
    
    .weight-item strong {
        color: #333;
        margin-bottom: 0.25rem;
    }
    
    .weight-item span {
        color: #666;
        font-size: 0.85rem;
    }
    
    .progress-section {
        margin-bottom: 2rem;
    }
    
    .progress-item {
        margin-bottom: 1.5rem;
    }
    
    .progress-item h3 {
        margin-bottom: 0.5rem;
        color: #555;
    }
    
    .progress-bar {
        width: 100%;
        height: 30px;
        background: #e0e0e0;
        border-radius: 15px;
        overflow: hidden;
    }
    
    .progress-fill {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 600;
        transition: width 0.3s ease;
    }
    
    .progress-fill.overall {
        background: linear-gradient(90deg, #4CAF50, #45a049);
    }
    
    .progress-fill.league {
        background: linear-gradient(90deg, #2196F3, #1976D2);
    }
    
    .results-section {
        margin-bottom: 2rem;
        padding: 1rem;
        background: white;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .results-section h3 {
        margin-bottom: 1rem;
        color: #555;
    }
    
    table {
        width: 100%;
        border-collapse: collapse;
    }
    
    th, td {
        padding: 0.75rem;
        text-align: left;
        border-bottom: 1px solid #ddd;
    }
    
    th {
        background: #f5f5f5;
        font-weight: 600;
        color: #555;
    }
    
    .log-section {
        margin-top: 2rem;
    }
    
    .log-section h3 {
        margin-bottom: 1rem;
        color: #555;
    }
    
    .log-container {
        height: 300px;
        overflow-y: auto;
        background: #1e1e1e;
        color: #d4d4d4;
        padding: 1rem;
        border-radius: 4px;
        font-family: 'Courier New', monospace;
        font-size: 0.9rem;
    }
    
    .log-entry {
        margin-bottom: 0.25rem;
    }
    
    .log-time {
        color: #858585;
        margin-right: 0.5rem;
    }
    
    .log-message {
        color: #d4d4d4;
    }
    
    .log-message.error {
        color: #f48771;
    }
    
    .log-message.success {
        color: #89d185;
    }
</style>