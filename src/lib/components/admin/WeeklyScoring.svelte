<script>
    function scoreDefensiveAdvanced(per90Data, detailedPosition) {
    const weights = defenseWeightMap[detailedPosition];
    if (!weights) return 0;
    
    let score = 0;
    // Original categories
    score += (per90Data.TacklesPer90 || 0) * (weights.TacklesPer90 || 0);
    score += (per90Data.FoulsPer90 || 0) * (weights.FoulsPer90 || 0);
    score += (per90Data.InterceptionsPer90 || 0) * (weights.InterceptionsPer90 || 0);
    score += (per90Data.ClearancesPer90 || 0) * (weights.ClearancesPer90 || 0);
    score += (per90Data.AerialsWonPer90 || 0) * (weights.AerialsWonPer90 || 0);
    score += (per90Data.DuelsWonPercentage || 0) * (weights.DuelsWonPercentage || 0);
    score += (per90Data.Cleansheets || 0) * (weights.Cleansheets || 0);
    score += (per90Data.ErrorLeadToGoal || 0) * (weights.ErrorLeadToGoal || 0);
    score += (per90Data.DribbledPastPer90 || 0) * (weights.DribbledPastPer90 || 0);
    
    // New categories
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
    
    score = (score * 0.8);
    return capScore(score);
}

function scorePassingAdvanced(per90Data, detailedPosition) {
    const weights = passingWeightMap[detailedPosition];
    if (!weights) return 0;
    
    let score = 0;
    // Original categories
    score += (per90Data.BigChancesCreatedPer90 || 0) * (weights.BigChancesCreatedPer90 || 0);
    score += (per90Data.KeyPassesPer90 || 0) * (weights.KeyPassesPer90 || 0);
    score += (per90Data.AccuratePassesPercentage || 0) * (weights.AccuratePassesPercentage || 0);
    score += (per90Data.PassesPer90 || 0) * (weights.PassesPer90 || 0);
    score += (per90Data.AssistsPer90 || 0) * (weights.AssistsPer90 || 0);
    score += (per90Data.AccurateCrossesPer90 || 0) * (weights.AccurateCrossesPer90 || 0);
    score += (per90Data.ThroughBallsPer90 || 0) * (weights.ThroughBallsPer90 || 0);
    
    // New categories
    score += (per90Data.ChancesCreatedPer90 || 0) * (weights.ChancesCreatedPer90 || 0);
    score += (per90Data.LongBallsPer90 || 0) * (weights.LongBallsPer90 || 0);
    score += (per90Data.BackwardPassesPer90 || 0) * (weights.BackwardPassesPer90 || 0);
    score += (per90Data.PassesInFinalThirdPer90 || 0) * (weights.PassesInFinalThirdPer90 || 0);
    score += (per90Data.AccuratePassesPer90 || 0) * (weights.AccuratePassesPer90 || 0);
    score += (per90Data.ThroughBallsWonPer90 || 0) * (weights.ThroughBallsWonPer90 || 0);
    score += (per90Data.TotalCrossesPer90 || 0) * (weights.TotalCrossesPer90 || 0);
    score += (per90Data.SuccessfulCrossesPercentage || 0) * (weights.SuccessfulCrossesPercentage || 0);
    
    if (detailedPosition === 'Goalkeeper') {
        score *= 4;
    }
    
    return capScore(score);
}

function scorePossessionAdvanced(per90Data, detailedPosition) {
    const weights = possessionWeightMap[detailedPosition];
    if (!weights) return 0;
    
    let score = 0;
    // Original categories
    score += (per90Data.AccuratePassesPer90 || 0) * (weights.AccuratePassesPer90 || 0);
    score += (per90Data.AccuratePassesPercentage || 0) * (weights.AccuratePassesPercentage || 0);
    score += (per90Data.PassesPer90 || 0) * (weights.PassesPer90 || 0);
    score += (per90Data.SuccessfulDribblesPer90 || 0) * (weights.SuccessfulDribblesPer90 || 0);
    score += (per90Data.DispossessedPer90 || 0) * (weights.DispossessedPer90 || 0);
    score += (per90Data.FoulsPer90 || 0) * (weights.FoulsPer90 || 0);
    score += (per90Data.FoulsDrawnPer90 || 0) * (weights.FoulsDrawnPer90 || 0);
    
    // New categories
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
    score = (score / 30) * passAccuracy;
    
    if (score <= 100) {
        score = passAccuracy;
    }
    
    return capScore(score);
}

function scoreAttackingAdvanced(per90Data, detailedPosition) {
    const weights = attackingWeightMap[detailedPosition];
    if (!weights) return 0;
    
    let score = 0;
    // Original categories
    score += (per90Data.AssistsPer90 || 0) * (weights.AssistsPer90 || 0);
    score += (per90Data.BigChancesCreatedPer90 || 0) * (weights.BigChancesCreatedPer90 || 0);
    score += (per90Data.GoalsPer90 || 0) * (weights.GoalsPer90 || 0);
    score += (per90Data.ShotsOnTargetPer90 || 0) * (weights.ShotsOnTargetPer90 || 0);
    score += (per90Data.SuccessfulDribblesPer90 || 0) * (weights.SuccessfulDribblesPer90 || 0);
    score += (per90Data.KeyPassesPer90 || 0) * (weights.KeyPassesPer90 || 0);
    
    // New categories
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
    
    score = score * 2;
    return capScore(score);
}

function scoreFinishingAdvanced(per90Data, detailedPosition) {
    const weights = finishingWeightMap[detailedPosition];
    if (!weights) return 0;
    
    let score = 0;
    // Original categories
    score += (per90Data.BigChancesMissedPer90 || 0) * (weights.BigChancesMissedPer90 || 0);
    score += (per90Data.GoalsPer90 || 0) * (weights.GoalsPer90 || 0);
    score += (per90Data.HitWoodworkPer90 || 0) * (weights.HitWoodworkPer90 || 0);
    score += (per90Data.BlockedShotsPer90 || 0) * (weights.BlockedShotsPer90 || 0);
    score += (per90Data.ShotsOffTargetPer90 || 0) * (weights.ShotsOffTargetPer90 || 0);
    score += (per90Data.ShotsOnTargetPer90 || 0) * (weights.ShotsOnTargetPer90 || 0);
    score += (per90Data.OffsidessPer90 || 0) * (weights.OffsidessPer90 || 0);
    
    // New categories
    score += (per90Data.PenaltiesMissedPer90 || 0) * (weights.PenaltiesMissedPer90 || 0);
    score += (per90Data.PenaltiesScoredPer90 || 0) * (weights.PenaltiesScoredPer90 || 0);
    score += (per90Data.ShotsTotalPer90 || 0) * (weights.ShotsTotalPer90 || 0);
    
    score = score * 2;
    return capScore(score);
}

function scoreKeeperAdvanced(per90Data, detailedPosition) {
    const weights = keepingWeightMap[detailedPosition];
    if (!weights) return 0;
    
    let score = 0;
    // Original categories
    score += (per90Data.AerialsWonPer90 || 0) * (weights.AerialsWonPer90 || 0);
    score += (per90Data.Cleansheets || 0) * (weights.Cleansheets || 0);
    score += (per90Data.ClearancesPer90 || 0) * (weights.ClearancesPer90 || 0);
    score += (per90Data.GoalsConcededPer90 || 0) * (weights.GoalsConcededPer90 || 0);
    score += (per90Data.ErrorLeadToGoal || 0) * (weights.ErrorLeadToGoal || 0);
    score += (per90Data.SavesPer90 || 0) * (weights.SavesPer90 || 0);
    score += (per90Data.SavesInsideboxPer90 || 0) * (weights.SavesInsideBoxPer90 || 0);
    score += (per90Data.DuelsWonPercentage || 0) * (weights.DuelsWonPercentage || 0);
    
    // New categories
    score += (per90Data.FoulsDrawnPer90 || 0) * (weights.FoulsDrawnPer90 || 0);
    score += (per90Data.FoulsPer90 || 0) * (weights.FoulsPer90 || 0);
    score += (per90Data.LongBallsWonPer90 || 0) * (weights.LongBallsWonPer90 || 0);
    score += (per90Data.GoalkeeperGoalsConcededPer90 || 0) * (weights.GoalkeeperGoalsConcededPer90 || 0);
    score += (per90Data.PunchesPer90 || 0) * (weights.PunchesPer90 || 0);
    score += (per90Data.GoodHighClaimPer90 || 0) * (weights.GoodHighClaimPer90 || 0);
    score += (per90Data.PenaltiesSavedPer90 || 0) * (weights.PenaltiesSavedPer90 || 0);
    
    score = (score / 14);
    return capScore(score);
}
</script>