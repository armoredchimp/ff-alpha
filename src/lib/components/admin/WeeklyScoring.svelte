<script>
    import { supabase } from "$lib/client/supabase/supaClient";
    import { 
        defenseWeightMap, 
        passingWeightMap, 
        possessionWeightMap, 
        attackingWeightMap, 
        keepingWeightMap, 
        finishingWeightMap 
    } from "$lib/stores/generic.svelte";
    
    // ============================================
    // SHARED CONFIGURATION AND UTILITIES
    // ============================================
    
    const BASE_SCORE = 1000;

    const statTypeMap = {
        'cleansheets': false,
        'error_lead_to_goal': false,
        'duels_won_percentage': false,
        'tackles_won_percentage': false,
        'aerials_won_percentage': false,
        'successful_crosses_percentage': false,
        'accurate_passes_percentage': false,
        'long_balls_won_percentage': false,
        'minutes_played': false,
    };

    function formatStatName(snakeCaseStr, addPer90 = null) {
        const mappedValue = statTypeMap[snakeCaseStr.toLowerCase()];
        const shouldAddPer90 = mappedValue !== undefined ? mappedValue : (addPer90 !== null ? addPer90 : true);
        
        const pascalCase = snakeCaseStr
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('');
        
        return shouldAddPer90 ? `${pascalCase}Per90` : pascalCase;
    }

    // ============================================
    // CORE SCORING FUNCTIONS
    // ============================================

    // Generic scoring function with detailed logging
    function calculateScore(per90Data, weights, statKeys, categoryName, scaleFactor, enableLogging = true, useBase) {
        if (enableLogging) {
            console.log(`\n======= ${categoryName} Score Calculation =======`);
            console.log(`Position weights:`, weights);
        }
        
        let totalScore = 0;
        if(useBase){
            totalScore += BASE_SCORE
        }
        
        statKeys.forEach(statKey => {
            const statValue = per90Data[statKey] || 0;
            const weight = weights[statKey] || 0;
            const contribution = statValue * weight;
            totalScore += contribution;
            
            // Log each stat's contribution only if logging is enabled
            if (enableLogging && (statValue !== 0 || weight !== 0)) {
                console.log(`${statKey}:`);
                console.log(`  Value: ${statValue.toFixed(4)}`);
                console.log(`  Weight: ${weight}`);
                console.log(`  Contribution: ${contribution.toFixed(4)}`);
                console.log(`  Running Total: ${totalScore.toFixed(4)}`);
            }
        });
        
        // Apply scale factor if needed
        let finalScore = totalScore * scaleFactor;
        if(finalScore < 0){
            finalScore = 0
        }
        if (enableLogging) {
            console.log(`\nRaw Total: ${totalScore.toFixed(4)}`);
            if (scaleFactor !== 1) {
                console.log(`Scale Factor: ${scaleFactor}`);
                console.log(`Final Score: ${finalScore.toFixed(4)}`);
            }
            console.log(`======= End ${categoryName} =======\n`);
        }
        
        return finalScore;
    }

    function scoreDefensiveAdvanced(per90Data, detailedPosition, enableLogging = true) {
        const weights = defenseWeightMap[detailedPosition];
        if (!weights) {
            if (enableLogging) console.log(`No defensive weights for position: ${detailedPosition}`);
            return 0;
        }
        
        const defenseStats = [
            'TacklesPer90',
            'FoulsPer90',
            'InterceptionsPer90',
            'ClearancesPer90',
            'AerialsWonPer90',
            'DuelsWonPercentage',
            'Cleansheets',
            'ErrorLeadToGoal',
            'DribbledPastPer90',
            'BlockedShotsPer90',
            'GoalsConcededPer90',
            'CrossesBlockedPer90',
            'LongBallsWonPer90',
            'ClearanceOfflinePer90',
            'ErrorLeadToShotPer90',
            'LastManTacklePer90',
            'OffsidesProvokedPer90',
            'TacklesWonPercentage',
            'DuelsLostPer90',
            'AerialsLostPer90',
            'AerialsWonPercentage',
            'BallRecoveryPer90',
            'LongBallsWonPercentage'
        ];
        
        let score = calculateScore(per90Data, weights, defenseStats, `Defensive (${detailedPosition})`, 4, enableLogging, true);

        // Stat not available in all leagues, will return to this later
        // const tacklesWonPercentage = per90Data.TacklesWonPercentage || 50;
        // if(enableLogging){
        //     console.log('TACKLES WON PERCENTAGE:', tacklesWonPercentage);
        // }
        // switch(true) {
        //     case tacklesWonPercentage > 95:
        //         score *= 1.5;
        //         break;
        //     case tacklesWonPercentage > 90:
        //         score *= 1.4;
        //         break;
        //     case tacklesWonPercentage > 85:
        //         score *= 1.3;
        //         break;
        //     case tacklesWonPercentage > 80:
        //         score *= 1.2;
        //         break;
        //     case tacklesWonPercentage > 70:
        //         score *= 1.1;
        //         break;
        //     case tacklesWonPercentage > 60:
        //         break;
        //     case tacklesWonPercentage > 50:
        //         score *= 0.9;
        //         break;
        //     case tacklesWonPercentage > 40:
        //         score *= 0.7;
        //         break;
        //     case tacklesWonPercentage <= 40:
        //         score *= 0.5;
        //         break;
        // }

        return score;
    }

    function scorePassingAdvanced(per90Data, detailedPosition, enableLogging = true) {
        const weights = passingWeightMap[detailedPosition];
        if (!weights) {
            if (enableLogging) console.log(`No passing weights for position: ${detailedPosition}`);
            return 0;
        }
        
        const passingStats = [
            'BigChancesCreatedPer90',
            'KeyPassesPer90',
            'AccuratePassesPercentage',
            'PassesPer90',
            'AssistsPer90',
            'AccurateCrossesPer90',
            'ThroughBallsPer90',
            'ChancesCreatedPer90',
            'LongBallsPer90',
            'BackwardPassesPer90',
            'PassesInFinalThirdPer90',
            'AccuratePassesPer90',
            'SuccessfulCrossesPercentage'
        ];
        
        const scaleFactor = detailedPosition === 'Goalkeeper' ? 1 : 0.6;
        return calculateScore(per90Data, weights, passingStats, `Passing (${detailedPosition})`, scaleFactor, enableLogging, true);
    }

    function scorePossessionAdvanced(per90Data, detailedPosition, enableLogging = true) {
        const weights = possessionWeightMap[detailedPosition];
        if (!weights) {
            if (enableLogging) console.log(`No possession weights for position: ${detailedPosition}`);
            return 0;
        }
        
        const possessionStats = [
            'AccuratePassesPer90',
            'PassesPer90',
            'SuccessfulDribblesPer90',
            'DispossessedPer90',
            'FoulsPer90',
            'FoulsDrawnPer90',
            'LongBallsWonPer90',
            'ShotsOffTargetPer90',
            'KeyPassesPer90',
            'BigChancesCreatedPer90',
            'ThroughBallsWonPer90',
            'OffsidesPer90',
            'DuelsWonPer90',
            'TouchesPer90',
            'PossessionLostPer90',
            'BallRecoveryPer90',
            'BackwardPassesPer90',
            'TurnOverPer90',
            'LongBallsPer90',
            'LongBallsWonPercentage',
            'AerialsLostPer90',
            'AerialsWonPercentage',
            'ThroughBallsPer90'
        ];
        
        // Calculate base score
        let score = calculateScore(per90Data, weights, possessionStats, `Possession (${detailedPosition})`, 1, enableLogging, true);
        
     
        const passAccuracy = per90Data.AccuratePassesPercentage || 0;
        if(enableLogging){
            console.log('PASS ACCURACY:', passAccuracy)
        }
        switch(true) {
            case passAccuracy > 95:
                score *= 3;
                break;
            case passAccuracy > 90:
                score *= 2.75;
                break;
            case passAccuracy > 85:
                score *= 2.3;
                break;
            case passAccuracy > 80:
                score *= 2;
                break;
            case passAccuracy > 70:
                score *= 1.4;
                break;
            case passAccuracy > 60:
                break;
            case passAccuracy > 50:
                score *= 0.8;
                break;
            case passAccuracy > 40: 
                score *= 0.5;
                break;
            case passAccuracy <= 40:
                score *= 0.3;
                break;
        }
        
    
        return score;
    }

    function scoreAttackingAdvanced(per90Data, detailedPosition, enableLogging = true) {
        const weights = attackingWeightMap[detailedPosition];
        if (!weights) {
            if (enableLogging) console.log(`No attacking weights for position: ${detailedPosition}`);
            return 0;
        }
        
        const attackingStats = [
            'AssistsPer90',
            'BigChancesCreatedPer90',
            'GoalsPer90',
            'ShotsOnTargetPer90',
            'SuccessfulDribblesPer90',
            'KeyPassesPer90',
            'AccurateCrossesPer90',
            'BigChancesMissedPer90',
            'HitWoodworkPer90',
            'LongBallsWonPer90',
            'OffsidesPer90',
            'OwnGoalsPer90',
            'ShotsBlockedPer90',
            'ShotsOffTargetPer90',
            'ChancesCreatedPer90',
            'PenaltiesWonPer90',
            'PassesInFinalThirdPer90',
            'SuccessfulCrossesPercentage',
            'DribbleAttemptsPer90',
            'ThroughBallsWonPer90'
        ];
        
        return calculateScore(per90Data, weights, attackingStats, `Attacking (${detailedPosition})`, 1, enableLogging, true);
    }

    function scoreFinishingAdvanced(per90Data, detailedPosition, enableLogging = true) {
        const weights = finishingWeightMap[detailedPosition];
        if (!weights) {
            if (enableLogging) console.log(`No finishing weights for position: ${detailedPosition}`);
            return 0;
        }
        
        const finishingStats = [
            'BigChancesMissedPer90',
            'GoalsPer90',
            'HitWoodworkPer90',
            'BlockedShotsPer90',
            'ShotsOffTargetPer90',
            'ShotsOnTargetPer90',
            'OffsidessPer90',  // Note: double 's' in original
            'PenaltiesMissedPer90',
            'PenaltiesScoredPer90',
            'ShotsTotalPer90'
        ];
        
        return calculateScore(per90Data, weights, finishingStats, `Finishing (${detailedPosition})`, 1, enableLogging, false);
    }

    function scoreKeeperAdvanced(per90Data, detailedPosition, enableLogging = true) {
        const weights = keepingWeightMap[detailedPosition];
        if (!weights) {
            if (enableLogging) console.log(`No keeping weights for position: ${detailedPosition}`);
            return 0;
        }
        
        const keeperStats = [
            'AerialsWonPer90',
            'Cleansheets',
            'ClearancesPer90',
            'GoalsConcededPer90',
            'ErrorLeadToGoal',
            'SavesPer90',
            'SavesInsideBoxPer90',  // Note: different capitalization from original
            'DuelsWonPercentage',
            'FoulsDrawnPer90',
            'FoulsPer90',
            'LongBallsWonPer90',
            'GoalkeeperGoalsConcededPer90',
            'PunchesPer90',
            'GoodHighClaimPer90',
            'PenaltiesSavedPer90'
        ];
        
        return calculateScore(per90Data, weights, keeperStats, `Keeper (${detailedPosition})`, 1, enableLogging, true);
    }

    // ============================================
    // SHARED SCORING LOGIC
    // ============================================
    
    function convertToPer90Data(data, minutes) {
        const adjustedMinutes = minutes > 20 ? minutes : 20;
        let per90Data = {};
        
        for (const [key, value] of Object.entries(data)) {
            if (key === 'player_id' || key === 'minutes_played' || value === null) {
                continue;
            }
            
            const formattedKey = formatStatName(key);
            // Check if this stat should be adjusted by minutes
            const shouldAdjustByMinutes = statTypeMap[key.toLowerCase()] !== false;
            
            if (shouldAdjustByMinutes) {
                per90Data[formattedKey] = (value / adjustedMinutes) * 90;
            } else {
                // For percentage stats and others in statTypeMap, use raw value
                per90Data[formattedKey] = value;
            }
        }

        return per90Data;
    }
    
    function calculatePlayerScores(data, enableLogging = true) {
        const minutes = data['minutes_played'];
        const adjustedMinutes = minutes > 20 ? minutes : 20;
        
        if (enableLogging) {
            console.log(`Minutes played: ${minutes}, Adjusted minutes: ${adjustedMinutes}`);
        }
        
        // Convert to per90 data
        const per90Data = convertToPer90Data(data, minutes);
        
        if (enableLogging) {
            console.log(`\nPer90 Data Generated:`, per90Data);
        }
        
        const detailedPosition = data.detailed_position;
        if (enableLogging) {
            console.log(`\nPlayer Position: ${detailedPosition}`);
        }
        
        const scores = {
            player_id: data.player_id,
            player_name: data.player_name,
            attacking_score: null,
            defensive_score: null,
            passing_score: null,
            finishing_score: null,
            possession_score: null,
            keeper_score: null
        };

        if (detailedPosition && detailedPosition !== 'Goalkeeper') {
            scores.defensive_score = Math.round(scoreDefensiveAdvanced(per90Data, detailedPosition, enableLogging));
            scores.attacking_score = Math.round(scoreAttackingAdvanced(per90Data, detailedPosition, enableLogging));
            scores.possession_score = Math.round(scorePossessionAdvanced(per90Data, detailedPosition, enableLogging));
            scores.passing_score = Math.round(scorePassingAdvanced(per90Data, detailedPosition, enableLogging));
            scores.finishing_score = Math.round(scoreFinishingAdvanced(per90Data, detailedPosition, enableLogging));

            if(enableLogging) {

                console.log('\n📊 PRE-ADJUSTMENT SCORES (Outfield Player):');
                console.log(`  Defensive: ${scores.defensive_score}`);
                console.log(`  Attacking: ${scores.attacking_score}`);
                console.log(`  Possession: ${scores.possession_score}`);
                console.log(`  Passing: ${scores.passing_score}`);
                console.log(`  Finishing: ${scores.finishing_score}`);

                console.log(`Adjusted Minutes: ${adjustedMinutes}`)
            }

            scores.defensive_score = Math.round(((scores.defensive_score * adjustedMinutes) / 5) / 10 )
            scores.attacking_score = Math.round(((scores.attacking_score * adjustedMinutes) / 5) / 10 )
            scores.possession_score = Math.round(((scores.possession_score * adjustedMinutes) / 5) / 10 )
            scores.passing_score = Math.round(((scores.passing_score * adjustedMinutes) / 5) / 10 )
            scores.finishing_score = Math.round(scores.finishing_score / 2) 
            // Finishing score weighted differently and ignores minutes. Goals are goals. WIP 
            
            
            if (enableLogging) {
              

                console.log('\n📊 FINAL SCORES (Outfield Player):');
                console.log(`  Defensive: ${scores.defensive_score}`);
                console.log(`  Attacking: ${scores.attacking_score}`);
                console.log(`  Possession: ${scores.possession_score}`);
                console.log(`  Passing: ${scores.passing_score}`);
                console.log(`  Finishing: ${scores.finishing_score}`);
            }
        } else {
            scores.keeper_score = Math.round(scoreKeeperAdvanced(per90Data, detailedPosition, enableLogging));
            scores.passing_score = Math.round(scorePassingAdvanced(per90Data, detailedPosition, enableLogging));
            
            scores.keeper_score = Math.round(((scores.keeper_score * adjustedMinutes) / 5) / 10 )
            scores.passing_score = Math.round(((scores.passing_score * adjustedMinutes) / 5) / 10 )
            
            if (enableLogging) {
                console.log('\n📊 FINAL SCORES (Goalkeeper):');
                console.log(`  Keeper: ${scores.keeper_score}`);
                console.log(`  Passing: ${scores.passing_score}`);
            }
        }
        
        return scores;
    }

    // ============================================
    // INDIVIDUAL PLAYER SCORING
    // ============================================
    
    async function scoreIndividualPlayer(player_id) {
        console.log(`\n🎯 Starting scoring process for Player ID: ${player_id}`);
        

        const { data, error } = await supabase
            .from('current_week_stats')
            .select('*')
            .eq('player_id', player_id)
            .single();

        if (error) {
            console.error('Database error:', error);
            return;
        }

        if (data) {
            const scores = calculatePlayerScores(data, true); // Enable logging for individual scoring
            
            const { data: insertedData, error: insertError } = await supabase
                .from('current_week_scores')
                .upsert(scores, { 
                    onConflict: 'player_id'
                })
                .select();

            if (insertError) {
                console.error('Database insertion error:', insertError);
                return;
            }

            console.log('\n✅ Scores saved to database:', insertedData);
        }
    }

    // ============================================
    // BATCH PLAYER SCORING
    // ============================================
    
    let batchScoringInProgress = false;
    let batchProgress = {
        total: 0,
        processed: 0,
        successful: 0,
        failed: 0,
        currentBatch: 0,
        totalBatches: 0
    };
    
    async function scoreAllPlayers() {
        if (batchScoringInProgress) {
            console.log('⚠️ Batch scoring already in progress');
            return;
        }
        
        batchScoringInProgress = true;
        console.log('\n🚀 Starting batch scoring for all players...');
        
        // Reset progress
        batchProgress = {
            total: 0,
            processed: 0,
            successful: 0,
            failed: 0,
            currentBatch: 0,
            totalBatches: 0
        };
        
        try {

            // Clear the existing table data before processing new data
            const { error: deleteError } = await supabase
                .from('current_week_scores')
                .delete()
                .neq('player_id', 0); 
            
            if (deleteError) {
                console.error('Error clearing table:', deleteError);
                throw new Error(`Failed to clear existing data: ${deleteError.message}`);
            }

            // Get the count of all players
            const { count, error: countError } = await supabase
                .from('current_week_stats')
                .select('*', { count: 'exact', head: true });
            
            if (countError) {
                console.error('Error getting player count:', countError);
                return;
            }
            
            batchProgress.total = count;
            const batchSize = 50; // Process 50 players at a time
            batchProgress.totalBatches = Math.ceil(count / batchSize);
            
            console.log(`📊 Total players to process: ${count}`);
            console.log(`📦 Batch size: ${batchSize}`);
            console.log(`📦 Total batches: ${batchProgress.totalBatches}`);
            
            // Process in batches
            for (let i = 0; i < count; i += batchSize) {
                batchProgress.currentBatch = Math.floor(i / batchSize) + 1;
                console.log(`\n📦 Processing batch ${batchProgress.currentBatch} of ${batchProgress.totalBatches}...`);
                
                const { data: batch, error: batchError } = await supabase
                    .from('current_week_stats')
                    .select('*')
                    .range(i, Math.min(i + batchSize - 1, count - 1));
                
                if (batchError) {
                    console.error(`Error fetching batch ${batchProgress.currentBatch}:`, batchError);
                    continue;
                }
                
                // Process this batch
                const scoresArray = [];
                
                for (const playerData of batch) {
                    try {
                        const scores = calculatePlayerScores(playerData, false); // Disable logging for batch
                        scoresArray.push(scores);
                        batchProgress.processed++;
                    } catch (error) {
                        console.error(`Error scoring player ${playerData.player_id}:`, error);
                        batchProgress.failed++;
                        batchProgress.processed++;
                    }
                }
                
                // Batch insert/update scores

                if (scoresArray.length > 0) {
                    const { data: insertedData, error: insertError } = await supabase
                        .from('current_week_scores')
                        .insert(scoresArray, { 
                            onConflict: 'player_id'
                        })
                        .select();
                    
                    if (insertError) {
                        console.error(`Error inserting batch ${batchProgress.currentBatch}:`, insertError);
                        batchProgress.failed += scoresArray.length;
                    } else {
                        batchProgress.successful += scoresArray.length;
                        console.log(`✅ Batch ${batchProgress.currentBatch} saved: ${scoresArray.length} players`);
                    }
                }
                
                // Update UI progress
                updateBatchProgressUI();
                
                // Add a small delay between batches to avoid overwhelming the database
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            console.log('\n🎉 Batch scoring complete!');
            console.log(`📊 Final Results:`);
            console.log(`  - Total processed: ${batchProgress.processed}`);
            console.log(`  - Successful: ${batchProgress.successful}`);
            console.log(`  - Failed: ${batchProgress.failed}`);
            
        } catch (error) {
            console.error('Unexpected error during batch scoring:', error);
        } finally {
            batchScoringInProgress = false;
            updateBatchProgressUI();
        }
    }
    
    function updateBatchProgressUI() {
        // Force Svelte to update the UI
        batchProgress = batchProgress;
    }

    // ============================================
    // UI STATE AND HANDLERS
    // ============================================
    
    let playerId = '';

    function handleScoreIndividual() {
        if (playerId) {
            scoreIndividualPlayer(parseInt(playerId));
        }
    }
    
</script>

<!-- UI SECTION -->
<div class="container">
    <div class="scoring-section">
        <h2>Individual Player Scoring</h2>
        <div class="input-group">
            <input 
                type="number" 
                bind:value={playerId} 
                placeholder="Player ID" 
                disabled={batchScoringInProgress}
            />
            <button 
                on:click={handleScoreIndividual}
                disabled={batchScoringInProgress || !playerId}
            >
                Score Player
            </button>
        </div>
    </div>
    
    <div class="scoring-section">
        <h2>Batch Scoring</h2>
        <button 
            on:click={scoreAllPlayers}
            disabled={batchScoringInProgress}
            class="batch-button"
        >
            {batchScoringInProgress ? 'Scoring in progress...' : 'Score All Players'}
        </button>
        
        {#if batchScoringInProgress || batchProgress.processed > 0}
            <div class="progress-container">
                <div class="progress-info">
                    <span>Batch {batchProgress.currentBatch} of {batchProgress.totalBatches}</span>
                    <span>{batchProgress.processed} / {batchProgress.total} players</span>
                </div>
                <div class="progress-bar">
                    <div 
                        class="progress-fill" 
                        style="width: {(batchProgress.processed / batchProgress.total) * 100}%"
                    ></div>
                </div>
                <div class="progress-stats">
                    <span class="success">✓ {batchProgress.successful} successful</span>
                    <span class="error">✗ {batchProgress.failed} failed</span>
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    .container {
        max-width: 600px;
        margin: 20px auto;
        padding: 20px;
    }
    
    .scoring-section {
        background: white;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    h2 {
        margin: 0 0 15px 0;
        color: #333;
        font-size: 1.2em;
    }
    
    .input-group {
        display: flex;
        gap: 10px;
    }
    
    input {
        flex: 1;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
    }
    
    input:disabled {
        background-color: #f5f5f5;
        cursor: not-allowed;
    }
    
    button {
        padding: 10px 20px;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.2s;
    }
    
    button:hover:not(:disabled) {
        background-color: #0056b3;
    }
    
    button:disabled {
        background-color: #ccc;
        cursor: not-allowed;
    }
    
    .batch-button {
        width: 100%;
        padding: 12px;
        font-size: 16px;
        font-weight: bold;
    }
    
    .progress-container {
        margin-top: 20px;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 4px;
    }
    
    .progress-info {
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
        font-size: 14px;
        color: #666;
    }
    
    .progress-bar {
        height: 24px;
        background-color: #e9ecef;
        border-radius: 12px;
        overflow: hidden;
        margin-bottom: 10px;
    }
    
    .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #007bff, #0056b3);
        transition: width 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 12px;
        font-weight: bold;
    }
    
    .progress-stats {
        display: flex;
        justify-content: space-between;
        font-size: 14px;
    }
    
    .progress-stats .success {
        color: #28a745;
        font-weight: 500;
    }
    
    .progress-stats .error {
        color: #dc3545;
        font-weight: 500;
    }
</style>