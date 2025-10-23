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

    // Generic scoring function with detailed logging
    function calculateScore(per90Data, weights, statKeys, categoryName, scaleFactor = 1) {
        console.log(`\n======= ${categoryName} Score Calculation =======`);
        console.log(`Position weights:`, weights);
        
        let totalScore = 0;
        
        statKeys.forEach(statKey => {
            const statValue = per90Data[statKey] || 0;
            const weight = weights[statKey] || 0;
            const contribution = statValue * weight;
            totalScore += contribution;
            
            // Log each stat's contribution
            if (statValue !== 0 || weight !== 0) {
                console.log(`${statKey}:`);
                console.log(`  Value: ${statValue.toFixed(4)}`);
                console.log(`  Weight: ${weight}`);
                console.log(`  Contribution: ${contribution.toFixed(4)}`);
                console.log(`  Running Total: ${totalScore.toFixed(4)}`);
            }
        });
        
        // Apply scale factor if needed
        const finalScore = totalScore * scaleFactor;
        
        console.log(`\nRaw Total: ${totalScore.toFixed(4)}`);
        if (scaleFactor !== 1) {
            console.log(`Scale Factor: ${scaleFactor}`);
            console.log(`Final Score: ${finalScore.toFixed(4)}`);
        }
        console.log(`======= End ${categoryName} =======\n`);
        
        return finalScore;
    }

    function scoreDefensiveAdvanced(per90Data, detailedPosition) {
        const weights = defenseWeightMap[detailedPosition];
        if (!weights) {
            console.log(`No defensive weights for position: ${detailedPosition}`);
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
        
        return calculateScore(per90Data, weights, defenseStats, `Defensive (${detailedPosition})`, 0.3);
    }

    function scorePassingAdvanced(per90Data, detailedPosition) {
        const weights = passingWeightMap[detailedPosition];
        if (!weights) {
            console.log(`No passing weights for position: ${detailedPosition}`);
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
        
        const scaleFactor = detailedPosition === 'Goalkeeper' ? 4 : 1;
        return calculateScore(per90Data, weights, passingStats, `Passing (${detailedPosition})`, scaleFactor);
    }

    function scorePossessionAdvanced(per90Data, detailedPosition) {
        const weights = possessionWeightMap[detailedPosition];
        if (!weights) {
            console.log(`No possession weights for position: ${detailedPosition}`);
            return 0;
        }
        
        const possessionStats = [
            'AccuratePassesPer90',
            'AccuratePassesPercentage',
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
        let score = calculateScore(per90Data, weights, possessionStats, `Possession (${detailedPosition})`);
        
        // Apply special possession scoring logic
        const passAccuracy = per90Data.AccuratePassesPercentage || 0;
        score = (score / 60) * passAccuracy;
        
        console.log(`Possession Special Calculation:`);
        console.log(`  Pass Accuracy: ${passAccuracy}`);
        console.log(`  Score after (score/60)*accuracy: ${score.toFixed(4)}`);
        
        if (score <= 100) {
            score = passAccuracy;
            console.log(`  Score <= 100, using pass accuracy: ${score.toFixed(4)}`);
        }
        
        return score;
    }

    function scoreAttackingAdvanced(per90Data, detailedPosition) {
        const weights = attackingWeightMap[detailedPosition];
        if (!weights) {
            console.log(`No attacking weights for position: ${detailedPosition}`);
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
        
        return calculateScore(per90Data, weights, attackingStats, `Attacking (${detailedPosition})`);
    }

    function scoreFinishingAdvanced(per90Data, detailedPosition) {
        const weights = finishingWeightMap[detailedPosition];
        if (!weights) {
            console.log(`No finishing weights for position: ${detailedPosition}`);
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
        
        return calculateScore(per90Data, weights, finishingStats, `Finishing (${detailedPosition})`);
    }

    function scoreKeeperAdvanced(per90Data, detailedPosition) {
        const weights = keepingWeightMap[detailedPosition];
        if (!weights) {
            console.log(`No keeping weights for position: ${detailedPosition}`);
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
        
        return calculateScore(per90Data, weights, keeperStats, `Keeper (${detailedPosition})`, 1/14);
    }

    async function scorePlayer(player_id) {
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
            const minutes = data['minutes_played'];
            const adjustedMinutes = minutes > 20 ? minutes : 20;
            
            console.log(`Minutes played: ${minutes}, Adjusted minutes: ${adjustedMinutes}`);
            
            // Convert to per90 data
            let per90Data = {};
            for (const [key, value] of Object.entries(data)) {
                if (key === 'player_id' || key === 'minutes_played' || value === null) {
                    continue;
                }
                
                const formattedKey = formatStatName(key);
                // Check if this stat should be adjusted by minutes
                const shouldAdjustByMinutes = statTypeMap[key.toLowerCase()] !== false;
                
                if (shouldAdjustByMinutes) {
                    per90Data[formattedKey] = (value / adjustedMinutes);
                } else {
                    // For percentage stats and others in statTypeMap, use raw value
                    per90Data[formattedKey] = value;
                }
            }
            
            console.log(`\nPer90 Data Generated:`, per90Data);
            
            const detailedPosition = data.detailed_position;
            console.log(`\nPlayer Position: ${detailedPosition}`);
            
            const scores = {
                player_id: player_id,
                attacking_score: null,
                defensive_score: null,
                passing_score: null,
                finishing_score: null,
                possession_score: null,
                keeper_score: null
            };

            if (detailedPosition && detailedPosition !== 'Goalkeeper') {
                scores.defensive_score = Math.round(scoreDefensiveAdvanced(per90Data, detailedPosition));
                scores.attacking_score = Math.round(scoreAttackingAdvanced(per90Data, detailedPosition));
                scores.possession_score = Math.round(scorePossessionAdvanced(per90Data, detailedPosition));
                scores.passing_score = Math.round(scorePassingAdvanced(per90Data, detailedPosition));
                scores.finishing_score = Math.round(scoreFinishingAdvanced(per90Data, detailedPosition));
                
                console.log('\n📊 FINAL SCORES (Outfield Player):');
                console.log(`  Defensive: ${scores.defensive_score}`);
                console.log(`  Attacking: ${scores.attacking_score}`);
                console.log(`  Possession: ${scores.possession_score}`);
                console.log(`  Passing: ${scores.passing_score}`);
                console.log(`  Finishing: ${scores.finishing_score}`);
            } else {
                scores.keeper_score = Math.round(scoreKeeperAdvanced(per90Data, detailedPosition));
                scores.passing_score = Math.round(scorePassingAdvanced(per90Data, detailedPosition));
                
                console.log('\n📊 FINAL SCORES (Goalkeeper):');
                console.log(`  Keeper: ${scores.keeper_score}`);
                console.log(`  Passing: ${scores.passing_score}`);
            }

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

    let playerId = '';

    function handleScore() {
        if (playerId) {
            scorePlayer(parseInt(playerId));
        }
    }
</script>

<div>
    <input type="number" bind:value={playerId} placeholder="Player ID" />
    <button on:click={handleScore}>Score Player</button>
</div>

<style>
    div {
        display: flex;
        gap: 10px;
        margin: 20px;
    }
    
    input {
        padding: 8px;
        border: 1px solid #ccc;
        border-radius: 4px;
    }
    
    button {
        padding: 8px 16px;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }
    
    button:hover {
        background-color: #0056b3;
    }
</style>