<script>
    import { supabase } from "$lib/client/supabase/supaClient";
    import { defenseWeightMap, passingWeightMap, possessionWeightMap, attackingWeightMap, keepingWeightMap, finishingWeightMap } from "$lib/stores/generic.svelte";
    

    const statTypeMap = {
        'cleansheets': false,
        'error_lead_to_goal': false,
        'duels_won_percentage': false,
        'tackles_won_percentage': false,
        'aerials_won_percentage': false,
        'long_balls_won_percentage': false,
        'minutes_played': false,
    };

    function formatStatName(snakeCaseStr, addPer90 = null) {
        // Check if there's an exception in the map
        const mappedValue = statTypeMap[snakeCaseStr.toLowerCase()];
        const shouldAddPer90 = mappedValue !== undefined ? mappedValue : (addPer90 !== null ? addPer90 : true);
        
        // Convert snake_case to PascalCase
        const pascalCase = snakeCaseStr
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('');
        
        // Add Per90 suffix if needed
        return shouldAddPer90 ? `${pascalCase}Per90` : pascalCase;
    }

    async function scorePlayer(player_id){
        const { data, error } = await supabase
            .from('current_week_stats')
            .select('*')
            .eq('player_id', player_id)
            .single()

            if(error){
                console.error(error)
                return;
            }

            if(data){
                const minutes = data['minutes_played']

                let adjustedMinutes = minutes > 20 ? minutes : 20
                
            let per90Data = {}

            for (const [key, value] of Object.entries(data)) {
                if (key === 'player_id' || key === 'minutes_played' || value === null) {
                    continue;
                }
                
                const formattedKey = formatStatName(key);
                per90Data[formattedKey] = (value / adjustedMinutes);
            }
            
            const detailedPosition = data.detailed_position; 

            const scores = {
                player_id: player_id,
                attacking_score: null,
                defensive_score: null,
                passing_score: null,
                finishing_score: null,
                possession_score: null,
                keeper_score: null
            };

            if(detailedPosition && detailedPosition !== 'Goalkeeper'){
                scores.defensive_score = Math.round(scoreDefensiveAdvanced(per90Data, detailedPosition));
                scores.attacking_score = Math.round(scoreAttackingAdvanced(per90Data, detailedPosition));
                scores.possession_score = Math.round(scorePossessionAdvanced(per90Data, detailedPosition));
                scores.passing_score = Math.round(scorePassingAdvanced(per90Data, detailedPosition));
                scores.finishing_score = Math.round(scoreFinishingAdvanced(per90Data, detailedPosition));    
                
                console.log(scores.defensive_score, scores.attacking_score, scores.possession_score, scores.passing_score, scores.finishing_score)

            } else {
                scores.keeper_score = Math.round(scoreKeeperAdvanced(per90Data, detailedPosition));
                scores.passing_score = Math.round(scorePassingAdvanced(per90Data, detailedPosition));

                console.log(scores.keeper_score, scores.passing_score)
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

            console.log('Scores saved:', insertedData);
            }
    }

    let playerId = '';

    function handleScore() {
        if (playerId) {
            scorePlayer(parseInt(playerId));
        }
    }

function scoreDefensiveAdvanced(per90Data, detailedPosition) {
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
    
    score += (per90Data.BlockedShotsPer90 || 0) * (weights.BlockedShotsPer90 || 0);
    score += (per90Data.GoalsConcededPer90 || 0) * (weights.GoalsConcededPer90 || 0);
    score += (per90Data.CrossesBlockedPer90 || 0) * (weights.CrossesBlockedPer90 || 0);
    score += (per90Data.LongBallsWonPer90 || 0) * (weights.LongBallsWonPer90 || 0);
    score += (per90Data.ClearanceOfflinePer90 || 0) * (weights.ClearanceOfflinePer90 || 0);
    score += (per90Data.ErrorLeadToShotPer90 || 0) * (weights.ErrorLeadToShotPer90 || 0);
    score += (per90Data.LastManTacklePer90 || 0) * (weights.LastManTacklePer90 || 0);
    score += (per90Data.OffsidesProvokedPer90 || 0) * (weights.OffsidesProvokedPer90 || 0);
    score += (per90Data.TacklesWonPercentage || 0) * (weights.TacklesWonPercentage || 0);
    score += (per90Data.DuelsLostPer90 || 0) * (weights.DuelsLostPer90 || 0);
    score += (per90Data.AerialsLostPer90 || 0) * (weights.AerialsLostPer90 || 0);
    score += (per90Data.AerialsWonPercentage || 0) * (weights.AerialsWonPercentage || 0);
    score += (per90Data.BallRecoveryPer90 || 0) * (weights.BallRecoveryPer90 || 0);
    score += (per90Data.LongBallsWonPercentage || 0) * (weights.LongBallsWonPercentage || 0);
    
    score = (score * 0.3);
    return score
}

function scorePassingAdvanced(per90Data, detailedPosition) {
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
    
    score += (per90Data.ChancesCreatedPer90 || 0) * (weights.ChancesCreatedPer90 || 0);
    score += (per90Data.LongBallsPer90 || 0) * (weights.LongBallsPer90 || 0);
    score += (per90Data.BackwardPassesPer90 || 0) * (weights.BackwardPassesPer90 || 0);
    score += (per90Data.PassesInFinalThirdPer90 || 0) * (weights.PassesInFinalThirdPer90 || 0);
    score += (per90Data.AccuratePassesPer90 || 0) * (weights.AccuratePassesPer90 || 0);
    score += (per90Data.SuccessfulCrossesPercentage || 0) * (weights.SuccessfulCrossesPercentage || 0);
    
    if (detailedPosition === 'Goalkeeper') {
        score *= 4;
    }
    
    return score
}

function scorePossessionAdvanced(per90Data, detailedPosition) {
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
    
    score += (per90Data.LongBallsWonPer90 || 0) * (weights.LongBallsWonPer90 || 0);
    score += (per90Data.ShotsOffTargetPer90 || 0) * (weights.ShotsOffTargetPer90 || 0);
    score += (per90Data.KeyPassesPer90 || 0) * (weights.KeyPassesPer90 || 0);
    score += (per90Data.BigChancesCreatedPer90 || 0) * (weights.BigChancesCreatedPer90 || 0);
    score += (per90Data.ThroughBallsWonPer90 || 0) * (weights.ThroughBallsWonPer90 || 0);
    score += (per90Data.OffsidesPer90 || 0) * (weights.OffsidesPer90 || 0);
    score += (per90Data.DuelsWonPer90 || 0) * (weights.DuelsWonPer90 || 0);
    score += (per90Data.TouchesPer90 || 0) * (weights.TouchesPer90 || 0);
    score += (per90Data.PossessionLostPer90 || 0) * (weights.PossessionLostPer90 || 0);
    score += (per90Data.BallRecoveryPer90 || 0) * (weights.BallRecoveryPer90 || 0);
    score += (per90Data.BackwardPassesPer90 || 0) * (weights.BackwardPassesPer90 || 0);
    score += (per90Data.TurnOverPer90 || 0) * (weights.TurnOverPer90 || 0);
    score += (per90Data.LongBallsPer90 || 0) * (weights.LongBallsPer90 || 0);
    score += (per90Data.LongBallsWonPercentage || 0) * (weights.LongBallsWonPercentage || 0);
    score += (per90Data.AerialsLostPer90 || 0) * (weights.AerialsLostPer90 || 0);
    score += (per90Data.AerialsWonPercentage || 0) * (weights.AerialsWonPercentage || 0);
    score += (per90Data.ThroughBallsPer90 || 0) * (weights.ThroughBallsPer90 || 0);
    
    const passAccuracy = per90Data.AccuratePassesPercentage || 0;
    score = (score / 60) * passAccuracy;
    
    if (score <= 100) {
        score = passAccuracy;
    }
    
    return score
}

function scoreAttackingAdvanced(per90Data, detailedPosition) {
    const weights = attackingWeightMap[detailedPosition];
    if (!weights) return 0;
    
    let score = 0;
    score += (per90Data.AssistsPer90 || 0) * (weights.AssistsPer90 || 0);
    score += (per90Data.BigChancesCreatedPer90 || 0) * (weights.BigChancesCreatedPer90 || 0);
    score += (per90Data.GoalsPer90 || 0) * (weights.GoalsPer90 || 0);
    score += (per90Data.ShotsOnTargetPer90 || 0) * (weights.ShotsOnTargetPer90 || 0);
    score += (per90Data.SuccessfulDribblesPer90 || 0) * (weights.SuccessfulDribblesPer90 || 0);
    score += (per90Data.KeyPassesPer90 || 0) * (weights.KeyPassesPer90 || 0);
    
    score += (per90Data.AccurateCrossesPer90 || 0) * (weights.AccurateCrossesPer90 || 0);
    score += (per90Data.BigChancesMissedPer90 || 0) * (weights.BigChancesMissedPer90 || 0);
    score += (per90Data.HitWoodworkPer90 || 0) * (weights.HitWoodworkPer90 || 0);
    score += (per90Data.LongBallsWonPer90 || 0) * (weights.LongBallsWonPer90 || 0);
    score += (per90Data.OffsidesPer90 || 0) * (weights.OffsidesPer90 || 0);
    score += (per90Data.OwnGoalsPer90 || 0) * (weights.OwnGoalsPer90 || 0);
    score += (per90Data.ShotsBlockedPer90 || 0) * (weights.ShotsBlockedPer90 || 0);
    score += (per90Data.ShotsOffTargetPer90 || 0) * (weights.ShotsOffTargetPer90 || 0);
    score += (per90Data.ChancesCreatedPer90 || 0) * (weights.ChancesCreatedPer90 || 0);
    score += (per90Data.PenaltiesWonPer90 || 0) * (weights.PenaltiesWonPer90 || 0);
    score += (per90Data.PassesInFinalThirdPer90 || 0) * (weights.PassesInFinalThirdPer90 || 0);
    score += (per90Data.SuccessfulCrossesPercentage || 0) * (weights.SuccessfulCrossesPercentage || 0);
    score += (per90Data.DribbleAttemptsPer90 || 0) * (weights.DribbleAttemptsPer90 || 0);
    score += (per90Data.ThroughBallsWonPer90 || 0) * (weights.ThroughBallsWonPer90 || 0);
    
    return score
}

function scoreFinishingAdvanced(per90Data, detailedPosition) {
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
    
    score += (per90Data.PenaltiesMissedPer90 || 0) * (weights.PenaltiesMissedPer90 || 0);
    score += (per90Data.PenaltiesScoredPer90 || 0) * (weights.PenaltiesScoredPer90 || 0);
    score += (per90Data.ShotsTotalPer90 || 0) * (weights.ShotsTotalPer90 || 0);
    
    return score
}

function scoreKeeperAdvanced(per90Data, detailedPosition) {
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
    
    score += (per90Data.FoulsDrawnPer90 || 0) * (weights.FoulsDrawnPer90 || 0);
    score += (per90Data.FoulsPer90 || 0) * (weights.FoulsPer90 || 0);
    score += (per90Data.LongBallsWonPer90 || 0) * (weights.LongBallsWonPer90 || 0);
    score += (per90Data.GoalkeeperGoalsConcededPer90 || 0) * (weights.GoalkeeperGoalsConcededPer90 || 0);
    score += (per90Data.PunchesPer90 || 0) * (weights.PunchesPer90 || 0);
    score += (per90Data.GoodHighClaimPer90 || 0) * (weights.GoodHighClaimPer90 || 0);
    score += (per90Data.PenaltiesSavedPer90 || 0) * (weights.PenaltiesSavedPer90 || 0);
    
    score = (score / 14);
    return score
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