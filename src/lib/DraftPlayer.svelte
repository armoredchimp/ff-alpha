<script>
    import axios from "axios";
    import { supabase } from "./supabase/supaClient";
    import Page from "../routes/+page.svelte";
    let {
        player = {
            id: 0,
            display_name: '',
            team_name: '',
            position: '',
            detailedPosition: '',
            date_of_birth: 0,
            nationality_id: '',
            nationality: '',
            nation_image: '',
        }
    } = $props()

    let isExpanded = $state(false);
    let defense = $state(0)
    let passing = $state(0)
    let possession = $state(0)
    let attacking = $state(0)
    let total = $state(0)

    function capScore(score) {
        return Math.min(score, 5000);
    }

    
    function toggleExpand() {
        isExpanded = !isExpanded;
        if (isExpanded){
            getNation(player.nationality_id)
            console.log(player.id)
            getCalcScores(player.id)
            // getPlayerStats(player.id)
        }
    }

    function calculateAge(date_of_birth) {
        const dob = new Date(date_of_birth);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDifference = today.getMonth() - dob.getMonth();
        if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < dob.getDate())) {
            age--;
        }
        return age;
    }

        
    async function getCalcScores(id) {
    let { data: row, error } = await supabase
        .from('prem_stats_2425')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error(error);
    } else {
        console.log(row);

        getDefensiveScore(row);
        defense = capScore(defense);
        total = parseFloat(defense);

        getPassingScore(row);
        passing = capScore(passing);
        total += parseFloat(passing);

        getPossessionScore(row);
        possession = capScore(possession); 
        total += parseFloat(possession);

        getAttackingScore(row);
        attacking = capScore(attacking);
        total += parseFloat(attacking);

        total = (total / 4).toFixed(2);
    }
}


function getAttackingScore(row) {
    const baseWeights = {
        AccurateCrossesPer90: 60,
        AssistsPer90: 500,
        BigChancesCreatedPer90: 200,
        BigChancesMissedPer90: -300,
        GoalsPer90: 1400,
        KeyPassesPer90: 120,
        HitWoodworkPer90: 100,
        LongBallsWonPer90: 40,
        OffsidesPer90: -140,
        OwnGoalsPer90: -500,
        ShotsBlockedPer90: 30,
        ShotsOffTargetPer90: -100,
        ShotsOnTargetPer90: 80,
        SuccessfulDribblesPer90: 200
    }

    const isDefender = player.position === 'Defender';
    const isFullback = player.detailedPosition === 'Right Back' || player.detailedPosition === 'Left Back';
    const weights = { ...baseWeights };
    
    if (isDefender) {
        weights.GoalsPer90 = 2000
        weights.KeyPassesPer90 = 200
    }
    if (isFullback) {
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

    attacking = (attackingScore * 2).toFixed(2);
}
function getPossessionScore(row) {
    const baseWeights = {
        AccuratePassesPercentage: 20, 
        AccuratePassesPer90: 5, 
        SuccessfulDribblesPer90: 160, 
        LongBallsWonPer90: 80, 
        DispossessedPer90: -200, 
        FoulsPer90: -80,
        FoulsDrawnPer90: 160, 
        ShotsOffTargetPer90: -80, 
        KeyPassesPer90: 50, 
        ThroughBallsWonPer90: 70,
        OffsidesPer90: -520 
    };

    const isDefender = player.position === 'Defender';
    const isFullback = player.detailedPosition === 'Right Back' || player.detailedPosition === 'Left Back';
    const weights = { ...baseWeights };
    
    if (isDefender) {
        weights.AccuratePassesPer90 = 3;
        weights.AccuratePassesPercentage = 10;
        weights.KeyPassesPer90 = 30;
        weights.FoulsPer90 = -30;
    }
    if (isFullback) {
        weights.AccuratePassesPer90 = 10;
        weights.AccuratePassesPercentage = 30;
        weights.KeyPassesPer90 = 40;
    }

    const stats = {
        AccuratePasses: row['Accurate Passes'] || 0,
        AccuratePassesPercentage: row['Accurate Passes Percentage'] || 0,
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
    const accuratePassesPercentage = per90Stats.AccuratePassesPercentage || 0;
    if (accuratePassesPercentage >= 90) {
        const bonusMultiplier = Math.pow((accuratePassesPercentage - 90), 2);
        possessionScore += 150 + (bonusMultiplier * 15);
    }

    // Apply the minutes-played penalty for players under 1000 minutes
    if (minutesPlayed < 1000) {
        const minutesPercentage = minutesPlayed / 1000;
        possessionScore = possessionScore * minutesPercentage;
    }

    possession = (possessionScore / 1.5).toFixed(2);
}

function getPassingScore(row) {
    const baseWeights = {
        KeyPassesPer90: 400,
        AssistsPer90: 1300,
        AccurateCrossesPer90: 25,
        ThroughBallsPer90: 25,
        BigChancesCreatedPer90: 700
    };

    const isDefender = player.position === 'Defender';
    const isFullback = player.detailedPosition === 'Right Back' || player.detailedPosition === 'Left Back';
    const weights = { ...baseWeights };
    
    if (isDefender) {
        weights.AssistsPer90 = 1300;
        weights.BigChancesCreatedPer90 = 900
    }
    if (isFullback) {
        weights.AccurateCrossesPer90 = 85;
        weights.BigChancesCreatedPer90 = 1080;
        weights.KeyPassesPer90 = 520;
        weights.AssistsPer90 = 1490;
        weights.ThroughBallsPer90 = 40;
    }

    const stats = {
        BigChancesCreated: row['Big Chances Created'] || 0,
        KeyPasses: row['Key Passes'] || 0,
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
    const accuratePassesPercentage = per90Stats.AccuratePassesPercentage || 0;
    if (accuratePassesPercentage >= 90) {
        const bonusMultiplier = Math.pow((accuratePassesPercentage - 90), 2);
        passingScore += 35 + (bonusMultiplier * 10);
    } else if (accuratePassesPercentage >= 86) {
        passingScore += 25;
    }

    // Apply the minutes-played penalty for players under 1000 minutes
    if (minutesPlayed < 1000) {
        const minutesPercentage = minutesPlayed / 1000;
        passingScore = passingScore * minutesPercentage;
    }

    passing = passingScore.toFixed(2);
}

function getDefensiveScore(row) {
    const baseWeights = {
        TacklesPer90: 20,
        FoulsPer90: -30,
        InterceptionsPer90: 25,
        BlockedShotsPer90: 60,
        Cleansheets: 200,
        GoalsConcededPer90: -200,
        ClearancesPer90: 20,
        CrossesBlockedPer90: 180,
        AerialsWonPercentage: 30,
        DuelsWonPercentage: 50,
        DribbledPastPer90: -100, 
        ErrorLeadToGoal: -500,
        LongBallsWonPer90: 80
    };

    const isAttacker = player.position === 'Attacker'
    const isDefender = player.position === 'Defender'
    const isFullback = player.detailedPosition === 'Right Back' || player.detailedPosition === 'Left Back';
    const weights = { ...baseWeights };
    if (isAttacker){
        weights.TacklesPer90 = 60
        weights.InterceptionsPer90 = 45
    }
    if (!isDefender) {
        weights.Cleansheets = 20;
        weights.GoalsConcededPer90 = -100;
        weights.LongBallsWonPer90 = 5
        weights.ErrorLeadToGoal = -700
    }
    if (isFullback){
        weights.Cleansheets = 140;
        weights.GoalsConcededPer90 = -150;
        weights.CrossesBlockedPer90 = 240;
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
        TotalAerials: row['Total Aerials'] || 0,
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

    const aerialsWonPercentage = stats.TotalAerials > 0 ? (stats.AerialsWon / stats.TotalAerials) * 100 : 0;
    const duelsWonPercentage = stats.TotalDuels > 0 ? (stats.DuelsWon / stats.TotalDuels) * 100 : 0;

    per90Stats.AerialsWonPercentage = aerialsWonPercentage;
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


    defense = (defensiveScore * 0.8).toFixed(2);
}

async function getPlayerStats(id){
        try {
            const lad = await axios.get(`/api/players/${id}`,{
                params: {
                    include: 'statistics.details.type;position;detailedPosition',
                    filter: 'playerStatisticSeasons:23614'
                }
            })

            const playerData = lad.data.data; 
            console.log(playerData)
            if (playerData && playerData.statistics && playerData.statistics.length > 0) {
            playerData.statistics.forEach(seasonStats => {
                if (seasonStats.details) {
                    seasonStats.details.forEach(stat => {
                        const { type, value } = stat;
                        const statName = type.name;
                        let statValue;

                        if (statName === 'Substitutions') {
                            statValue = value.in; 
                        } else if (statName === 'Rating' || statName === 'Average Points Per Game') {
                            statValue = value.average;    
                        } else if (statName === 'Crosses Blocked') {
                            statValue = value.crosses_blocked;
                        } else if (value && value.total) { 
                            statValue = value.total;
                        } else if (typeof value === 'object' && Object.keys(value).length > 0) {
                            statValue = value; 
                        } else {
                            statValue = null; 
                        }

                        console.log(`${statName}: ${statValue}`);
                    });
                }
            });
        } else {
            console.log("No statistics found for this player.");
        }
                } catch(err){
                    console.error(err)
                }
    }


    //playerStatisticsSeasons:23614 playerStatisticDetailTypes:117'
    async function getNation(id) {
        try {
            const nationRes = await axios.get(`/core/countries/${id}`);
            player.nation_image = nationRes.data.data.image_path
            return;
        } catch (err) {
            console.error(`Error fetching nation for country_id ${id}:`, err);
            return {
                image_path: ''
            }
        }
    }
</script>

<div 
    role="button"
    tabindex="0"
    class="player-card" 
    class:expanded={isExpanded}
    onclick={toggleExpand}
    onkeydown={e => e.key === 'Enter' && toggleExpand()}
    aria-expanded={isExpanded}
    aria-label={`Player card for ${player.name}`}
>
    <div class="info">
        <div class="name-value">
            <h3>{player.display_name}</h3>
        </div>
        <div class="details">
            <span>{calculateAge(player.date_of_birth)} yrs</span>
            <span>{player.nationality}</span>
            <span>{player.team_name}</span>
            <span>{player.position}</span>
        </div>

        {#if isExpanded}
        <div class="expanded-content">
            <div class="top-section">
                <div class="image-section">
                    {#if player.image_path}
                        <img src={player.image_path} alt={player.display_name} class="player-photo" />
                    {/if}
                    {#if player.nation_image}
                        <img src={player.nation_image} alt={player.nationality} class="nation-image" />
                    {/if}
                    <span class="detailed-position">{player.detailedPosition}</span>
                </div>
            </div>
            <div class="stats-section">
                <div class="score">
                    <span>Defensive Score:</span>
                    <div class="progress-bar-container">
                        <div class="progress-bar">
                            <div class="progress" style={`width: ${(defense / 5000) * 100}%;`}></div>
                        </div>
                        <div class="popup">{defense}</div>
                    </div>
                </div>
                <div class="score">
                    <span>Passing Score:</span>
                    <div class="progress-bar-container">
                        <div class="progress-bar">
                            <div class="progress" style={`width: ${(passing / 5000) * 100}%;`}></div>
                        </div>
                        <div class="popup">{passing}</div>
                    </div>
                </div>
                <div class="score">
                    <span>Possession Score:</span>
                    <div class="progress-bar-container">
                        <div class="progress-bar">
                            <div class="progress" style={`width: ${(possession / 5000) * 100}%;`}></div>
                        </div>
                        <div class="popup">{possession}</div>
                    </div>
                </div>
                <div class="score">
                    <span>Attacking Score:</span>
                    <div class="progress-bar-container">
                        <div class="progress-bar">
                            <div class="progress" style={`width: ${(attacking / 5000) * 100}%;`}></div>
                        </div>
                        <div class="popup">{attacking}</div>
                    </div>
                </div>
                <div class="score">
                    <span>Overall Rating:</span>
                    <div class="progress-bar-container">
                        <div class="progress-bar">
                            <div class="progress" style={`width: ${(total / 5000) * 100}%;`}></div>
                        </div>
                        <div class="popup">{total}</div>
                    </div>
                </div>
            </div>
            <div class="expanded-info">
                </div>
        </div>
    {/if}
</div>
</div>

<style>
   .progress-bar-container {
        position: relative;
        display: inline-block; /* Important for proper width calculation */
    }

    .progress-bar {
        width: 100%;
        background-color: #e2e8f0;
        border-radius: 8px;
        overflow: hidden;
        height: 10px;
        margin-top: 0.5rem;
        cursor: pointer;
    }

    .progress {
        height: 100%;
        background-color: #4caf50;
        border-radius: 8px;
        transition: width 0.3s ease;
    }

    .popup {
        display: none;
        position: absolute;
        left: 0; /* Shift the popup to the left edge of the container */
        top: 100%; /* Position it below the progress bar */
        transform: translateY(5px); /* Add a slight offset below the bar */
        padding: 5px 10px;
        background-color: #333;
        color: #fff;
        border-radius: 4px;
        font-size: 0.9rem;
        white-space: nowrap;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        z-index: 1; /* Ensure it's above the progress bar */
    }

    .progress-bar-container:hover .popup {
        display: block;
    }

    .player-card {
        width: 100%;
        text-align: left;
        background: white;
        border: 1px solid #e2e8f0;
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 0.75rem;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }

    .player-card:hover {
        background-color: #f8fafc;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }

    .player-card.expanded {
        background-color: #f8fafc;
        padding: 1.5rem;
    }

    .info {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .name-value {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    h3 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: #1e293b;
    }

    .details {
        display: flex;
        gap: 1rem;
        font-size: 0.9rem;
        color: #64748b;
    }

    .expanded-content {
        margin-top: 1.5rem;
        padding-top: 1.5rem;
        border-top: 1px solid #e2e8f0;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .top-section {
        display: flex;
        align-items: center;
        gap: 1.5rem;
    }

    .image-section {
        display: flex;
        gap: 1.5rem;
        align-items: center;
    }

    .player-photo {
        width: 120px;
        height: 120px;
        border-radius: 50%;
        object-fit: cover;
        border: 3px solid #e2e8f0;
    }

    .nation-image {
        width: 80px;
        height: 80px;
        object-fit: cover;
        border-radius: 50%;
        border: 2px solid #e2e8f0;
    }

    .detailed-position {
        font-size: 1rem;
        font-weight: 500;
        color: #475569;
    }

    .stats-section {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .score {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        font-size: 0.95rem;
        color: #334155;
    }

    .expanded-info {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
</style>