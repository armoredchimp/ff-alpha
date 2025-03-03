
function getKeeperScore(row){
    const weights = {
        AerialsWonPer90: 120,
        Cleansheets: 3000,
        ClearancesPer90: 160,
        DuelsWonPercentage: 200,
        GoalsConcededPer90: -1800,
        ErrorLeadToGoal: -3000,
        FoulsDrawnPer90: 240,
        FoulsPer90: -240,
        LongBallsWonPer90: 40,
        SavesPer90: 260,
        SavesInsideBoxPer90: 280
    }

    const stats = {
        AerialsWon: row['Aerials Won'] || 0,
        Cleansheets: row['Cleansheets'] || 0,
        Clearances: row['Clearances'] || 0,
        GoalsConceded: row['Goals Conceded'] || 0,
        ErrorLeadToGoal: row['Error Lead To Goal'] || 0,
        FoulsDrawn: row['Fouls Drawn'] || 0,
        Fouls: row['Fouls'] || 0,
        LongBallsWon: row['Long Balls Won'] || 0,
        DuelsWon: row['Duels Won'] || 0,
        TotalDuels: row['Total Duels'] || 0,
        Saves: row['Saves'] || 0,
        SavesInsideBox: row['Saves Insidebox'] || 0
    }

    const minutesPlayed = row['Minutes Played'] || 0;

    const duelsWonPercentage = stats.TotalDuels > 0 ? (stats.DuelsWon / stats.TotalDuels) * 100 : 0;


    const per90Stats = {};
    for (const [key, value] of Object.entries(stats)) {
        per90Stats[`${key}Per90`] = (value / minutesPlayed) * 90;
    }

    per90Stats.DuelsWonPercentage = duelsWonPercentage;

    let keepingScore = 0;
    for (const [key, weight] of Object.entries(weights)) {
        keepingScore += (per90Stats[key] || 0) * weight;
    }

    let consistencyBonus = 0;
    if (minutesPlayed > 1000) {
        consistencyBonus = Math.floor((minutesPlayed - 1000) / 500) * 5;
    }
    keepingScore += consistencyBonus;

    // Apply the minutes-played penalty for players under 1000 minutes
    if (minutesPlayed < 1000) {
        const minutesPercentage = minutesPlayed / 1000;
        keepingScore = keepingScore * minutesPercentage;
    }

    return (keepingScore / 5).toFixed(2)
}

function getAttackingScore(row, position, detailedPosition) {
    const baseWeights = {
        AccurateCrossesPer90: 60,
        AssistsPer90: 500,
        BigChancesCreatedPer90: 250,
        BigChancesMissedPer90: -250,
        GoalsPer90: 1500,
        KeyPassesPer90: 60,
        HitWoodworkPer90: 100,
        LongBallsWonPer90: 30,
        OffsidesPer90: -140,
        OwnGoalsPer90: -500,
        ShotsBlockedPer90: 30,
        ShotsOffTargetPer90: -40,
        ShotsOnTargetPer90: 70,
        SuccessfulDribblesPer90: 120
    }

    const weights = { ...baseWeights };
    
    if (position === 'Defender') {
        weights.GoalsPer90 = 2000
        weights.KeyPassesPer90 = 200
        weights.BigChancesCreatedPer90 = 400;
    }
    if (detailedPosition === 'Right Back' || detailedPosition === 'Left Back') {
        weights.AccurateCrossesPer90 = 120
        weights.AssistsPer90 = 600
    }
    
    const stats = {
        AccuratePasses: row['Accurate Passes'] || 0,
        Assists: row.Assists || 0,
        BigChancesCreated: row['Big Chances Created'] || 0,
        BigChancesMissed: row['Big Chances Missed'] || 0,
        Goals: row['Goals'] || 0,
        HitWoodwork: row['Hit Woodwork'] || 0,
        ShotsBlocked: row['Shots Blocked'] || 0,
        ShotsOffTarget: row['Shots Off Target'] || 0,
        ShotsOnTarget: row['Shots On Target'] || 0,
        SuccessfulDribbles: row['Successful Dribbles'] || 0,
        LongBallsWon: row['Long Balls Won'] || 0,
        KeyPasses: row['Key Passes'] || 0,
        ThroughBallsWon: row['Through Balls Won'] || 0,
        Offsides: row['Offsides'] || 0
    };
    
    const minutesPlayed = row['Minutes Played'] || 0;

    // Simple per90 calculation without scaling
    const per90Stats = {};
    for (const [key, value] of Object.entries(stats)) {
        per90Stats[`${key}Per90`] = (value / minutesPlayed) * 90;
    }

    let attackingScore = 0;
    for (const [key, weight] of Object.entries(weights)) {
        attackingScore += (per90Stats[key] || 0) * weight;
    }

    // Apply consistency bonus if applicable
    let consistencyBonus = 0;
    if (minutesPlayed > 1000) {
        consistencyBonus = Math.floor((minutesPlayed - 1000) / 500) * 5;
    }
    attackingScore += consistencyBonus;

    // Apply the minutes-played penalty for players under 1000 minutes
    if (minutesPlayed < 1000) {
        const minutesPercentage = minutesPlayed / 1000;
        attackingScore = attackingScore * minutesPercentage;
    }

    return (attackingScore * 2).toFixed(2);
}
function getPossessionScore(row, position, detailedPosition) {
    const baseWeights = {
        // AccuratePassesPercentage: 20, 
        AccuratePassesPer90: 6,
        PassesPer90: 1, 
        SuccessfulDribblesPer90: 70, 
        LongBallsWonPer90: 60, 
        DispossessedPer90: -300, 
        FoulsPer90: -220,
        FoulsDrawnPer90: 100, 
        ShotsOffTargetPer90: -60, 
        KeyPassesPer90: 120,
        BigChancesCreatedPer90: 200, 
        ThroughBallsWonPer90: 70,
        OffsidesPer90: -320 
    };

    const weights = { ...baseWeights };
    
    if (position === 'Midfielder'){
        weights.DispossessedPer90 = -260;
        weights.FoulsDrawnPer90 = 120;
        // weights.AccuratePassesPer90 = 10;
        weights.PassesPer90 = 1.5;
        weights.OffsidesPer90 = -180
        weights.BigChancesCreatedPer90 = 280;
        weights.FoulsDrawnPer90 = 140
    }
    // if (detailedPosition === 'Attacking Midfield') {
    //     weights.DispossessedPer90 = -170;
    //     weights.FoulsDrawnPer90 = 130;
    //     weights.AccuratePassesPer90 = 12;
    //     weights.PassesPer90 = 2;
    //     weights.KeyPassesPer90 = 180;
    // }
    else if (position === 'Attacker') {
        weights.DispossessedPer90 = -220;
        // weights.PassesPer90 = 2;
        weights.AccuratePassesPer90 = 10;
        weights.KeyPassesPer90 = 160;
        weights.BigChancesCreatedPer90 = 260;
        weights.OffsidesPer90 = -120;
        weights.FoulsDrawnPer90 = 180
    }
    else if (position === 'Defender') {
        weights.AccuratePassesPer90 = 5;
        // weights.AccuratePassesPercentage = 10;
        weights.KeyPassesPer90 = 230;
        weights.FoulsPer90 = -30;
    }

    if (detailedPosition === 'Right Back' || detailedPosition === 'Left Back') {
        weights.AccuratePassesPer90 = 8;
        // weights.AccuratePassesPercentage = 30;
        // weights.KeyPassesPer90 = 240;
    } else if (detailedPosition === 'Centre Forward'){
        weights.DispossessedPer90 = -220;
        weights.PassesPer90 = 3;
        weights.AccuratePassesPer90 = 15;
        weights.KeyPassesPer90 = 180;
        weights.BigChancesCreatedPer90 = 300;
        weights.OffsidesPer90 = -60;
        weights.FoulsDrawnPer90 = 300
    }

    const stats = {
        AccuratePasses: row['Accurate Passes'] || 0,
        // AccuratePassesPercentage: row['Accurate Passes Percentage'] || 0,
        Passes: row['Passes'] || 0,
        SuccessfulDribbles: row['Successful Dribbles'] || 0,
        LongBallsWon: row['Long Balls Won'] || 0,
        Dispossessed: row['Dispossessed'] || 0,
        Fouls: row['Fouls'] || 0,
        FoulsDrawn: row['Fouls Drawn'] || 0,
        ShotsOnTarget: row['Shots Off Target'] || 0,
        KeyPasses: row['Key Passes'] || 0,
        ThroughBallsWon: row['Through Balls Won'] || 0,
        Offsides: row['Offsides'] || 0
    };

    const minutesPlayed = row['Minutes Played'] || 0;
    const AccuratePassesPercentage = row['Accurate Passes Percentage'] || 0;

    // Calculate regular per90 stats
    const per90Stats = {};
    for (const [key, value] of Object.entries(stats)) {
        if (key !== 'AccuratePassesPercentage') {
            per90Stats[`${key}Per90`] = (value / minutesPlayed) * 90;
        } else {
            per90Stats[key] = value;
        }
    }

    let possessionScore = 0;
    for (const [key, weight] of Object.entries(weights)) {
        possessionScore += (per90Stats[key] || 0) * weight;
    }

    // Add consistency bonus if applicable
    let consistencyBonus = 0;
    if (minutesPlayed > 1000) {
        consistencyBonus = Math.floor((minutesPlayed - 1000) / 500) * 5;
    }
    possessionScore += consistencyBonus;

    // Add bonus for high passing accuracy
    // const accuratePassesPercentage = per90Stats.AccuratePassesPercentage || 0;
    // if (accuratePassesPercentage >= 90) {
    //     const bonusMultiplier = Math.pow((accuratePassesPercentage - 90), 2);
    //     possessionScore += 150 + (bonusMultiplier * 15);
    // }

    // Apply the minutes-played penalty for players under 1000 minutes
    if (minutesPlayed < 1000) {
        const minutesPercentage = minutesPlayed / 1000;
        possessionScore = possessionScore * minutesPercentage;
    }

    possessionScore = (possessionScore / 30) * AccuratePassesPercentage

    if(possessionScore <= 100){
        possessionScore = AccuratePassesPercentage
    }

    return (possessionScore).toFixed(2);
}

function getPassingScore(row, position, detailedPosition) {
    const baseWeights = {
        KeyPassesPer90: 700,
        PassesPer90: 1,
        // AccuratePassesPercentage: 5,
        AssistsPer90: 1400,
        AccurateCrossesPer90: 25,
        ThroughBallsPer90: 25,
        BigChancesCreatedPer90: 900
    };

    const weights = { ...baseWeights };
    
    if (position === 'Goalkeeper') {
        weights.KeyPassesPer90 = 1200,
        weights.AssistsPer90 = 2200,
        weights.BigChancesCreatedPer90 = 1700,
        weights.ThroughBallsPer90 = 80
    }
    if (position === 'Midfielder') {
        weights.AssistsPer90 = 1600;
        weights.BigChancesCreatedPer90 = 1100;
        weights.KeyPassesPer90 = 900
    }
    if (position === 'Defender') {
        weights.AssistsPer90 = 1500;
        weights.KeyPassesPer90 = 1000,
        weights.BigChancesCreatedPer90 = 1200
        weights.ThroughBallsPer90 = 40;
    }
    // if (position === 'Attacking Midfield') {
    //     // weights.AssistsPer90 = 1700;
    //     weights.KeyPassesPer90 = 950;
    //     weights.BigChancesCreatedPer90 = 1200;
    // }
    if (detailedPosition === 'Right Back' || detailedPosition === 'Left Back') {
        weights.AccurateCrossesPer90 = 90;
        weights.BigChancesCreatedPer90 = 1000;
        // weights.KeyPassesPer90 = 700;
    }

    const stats = {
        BigChancesCreated: row['Big Chances Created'] || 0,
        KeyPasses: row['Key Passes'] || 0,
        AccuratePassesPercentage: row['Accurate Passes Percentage'] || 0,
        Passes: row['Passes'] || 0,
        Assists: row['Assists'] || 0,
        AccurateCrosses: row['Accurate Crosses'] || 0,
        ThroughBalls: row['Through Balls'] || 0,
    };

    const minutesPlayed = row['Minutes Played'] || 0;

    // Calculate regular per90 stats
    const per90Stats = {};
    for (const [key, value] of Object.entries(stats)) {
        per90Stats[`${key}Per90`] = (value / minutesPlayed) * 90;
    }

    let passingScore = 0;
    for (const [key, weight] of Object.entries(weights)) {
        passingScore += (per90Stats[key] || 0) * weight;
    }

    // Add consistency bonus if applicable
    let consistencyBonus = 0;
    if (minutesPlayed > 1000) {
        consistencyBonus = Math.floor((minutesPlayed - 1000) / 500) * 5;
    }
    passingScore += consistencyBonus;

    // Apply rating adjustments
    const rating = row.Rating || 0;
    if (rating >= 7.2) {
        passingScore += (rating - 7.1) * 100;
    } else if (rating >= 7.0) {
        passingScore += (rating - 6.9) * 75;
    } else if (rating < 6.5) {
        passingScore -= (6.5 - rating) * 100;
    } else if (rating < 6.7) {
        passingScore -= (6.7 - rating) * 75;
    }

    // Add bonus for high passing accuracy
    // const accuratePassesPercentage = per90Stats.AccuratePassesPercentage || 0;
    // if (accuratePassesPercentage >= 90) {
    //     const bonusMultiplier = Math.pow((accuratePassesPercentage - 90), 2);
    //     passingScore += 35 + (bonusMultiplier * 10);
    // } else if (accuratePassesPercentage >= 86) {
    //     passingScore += 25;
    // }

    // Apply the minutes-played penalty for players under 1000 minutes
    if (minutesPlayed < 1000) {
        const minutesPercentage = minutesPlayed / 1000;
        passingScore = passingScore * minutesPercentage;
    }
    if(position === 'Goalkeeper'){
        passingScore *= 4
    }

    return passingScore.toFixed(2);
}

function getDefensiveScore(row, position, detailedPosition) {
    const baseWeights = {
        TacklesPer90: 20,
        FoulsPer90: -120,
        InterceptionsPer90: 30,
        BlockedShotsPer90: 60,
        Cleansheets: 320,
        GoalsConcededPer90: -430,
        ClearancesPer90: 35,
        CrossesBlockedPer90: 140,
        AerialsWonPer90: 70,
        DuelsWonPercentage: 50,
        DribbledPastPer90: -120, 
        ErrorLeadToGoal: -500,
        LongBallsWonPer90: 20
    };

    const weights = { ...baseWeights };
    if (position === 'Attacker'){
        weights.TacklesPer90 = 100
        weights.InterceptionsPer90 = 105
    }
    if (position === 'Midfielder'){
        weights.TacklesPer90 = 60;
        weights.InterceptionsPer90 = 70
        weights.AerialsWonPer90 = 110
        weights.ClearancesPer90 = 120
    }
    if (position !== 'Defender') {
        weights.Cleansheets = 40;
        weights.GoalsConcededPer90 = -140;
        weights.LongBallsWonPer90 = 5
        weights.ErrorLeadToGoal = -700
    }
    if (detailedPosition === 'Right Back' || detailedPosition === 'Left Back'){
        weights.Cleansheets = 200;
        weights.GoalsConcededPer90 = -280;
        weights.CrossesBlockedPer90 = 260;
    }

    const stats = {
        Tackles: row.Tackles || 0,
        Fouls: row.Fouls || 0,
        Interceptions: row.Interceptions || 0,
        BlockedShots: row['Shots Blocked'] || 0,
        Cleansheets: row.Cleansheets || 0,
        GoalsConceded: row['Goals Conceded'] || 0,
        Clearances: row.Clearances || 0,
        AerialsWon: row['Aerials Won'] || 0,
        DuelsWon: row['Duels Won'] || 0,
        TotalDuels: row['Total Duels'] || 0,
        ErrorLeadToGoal: row['Error Lead To Goal'] || 0,
        DribbledPast: row['Dribbled Past'] || 0,
        LongBallsWon: row['Long Balls Won'] || 0,
    };

    const minutesPlayed = row['Minutes Played'] || 0;

    const per90Stats = {};
    for (const [key, value] of Object.entries(stats)) {
        if (key !== 'Cleansheets' && key !== 'ErrorLeadToGoal') {
            per90Stats[`${key}Per90`] = (value / minutesPlayed) * 90;
        } else {
            per90Stats[key] = value;
        }
    }

    const duelsWonPercentage = stats.TotalDuels > 0 ? (stats.DuelsWon / stats.TotalDuels) * 100 : 0;

    per90Stats.DuelsWonPercentage = duelsWonPercentage;

    let defensiveScore = 0;
    for (const [key, weight] of Object.entries(weights)) {
        defensiveScore += (per90Stats[key] || 0) * weight;
    }

    let consistencyBonus = 0;
    if (minutesPlayed > 1000) {
        consistencyBonus = Math.floor((minutesPlayed - 1000) / 500) * 5;
    }
    defensiveScore += consistencyBonus;

    const rating = row.Rating || 0;

    if (rating >= 7.2) {
        defensiveScore += (rating - 7.1) * 100;
    } else if (rating >= 7.0) {
        defensiveScore += (rating - 6.9) * 75;
    } else if (rating < 6.5) {
        defensiveScore -= (6.5 - rating) * 100;
    } else if (rating < 6.7) {
        defensiveScore -= (6.7 - rating) * 75;
    }

    // Dribbled Past Adjustment (Non-linear penalty)
    const dribbledPast = per90Stats.DribbledPastPer90 || 0;
    let dribbledPastPenalty = 0;

    
    if (dribbledPast > 0) {
        const basePenalty = 20; // Penalty for even being dribbled past once
        const scaleFactor = 30;  // Adjust steepness of the curve
        const exponent = 2;      // Adjust the shape of the curve (higher = faster increase)
        const maxPenalty = 250;    // Cap on the penalty

        dribbledPastPenalty = Math.min(basePenalty + scaleFactor * Math.pow(dribbledPast, exponent), maxPenalty);
        defensiveScore -= dribbledPastPenalty;
    }

    if (minutesPlayed < 1000) {
        const minutesPercentage = minutesPlayed / 1000;
        defensiveScore = defensiveScore * minutesPercentage;
    }


    return (defensiveScore * 0.8).toFixed(2);
}

export { getAttackingScore, getDefensiveScore, getKeeperScore, getPassingScore, getPossessionScore }