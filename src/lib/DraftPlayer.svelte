<script>
    import axios from "axios";
    import { supabase } from "./supabase/supaClient";
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

    	
    async function getCalcScores(id){
        let { data: row, error } = await supabase
        .from('prem_stats_2425')
        .select('*')
        .eq('id', id)
        .single()

        if(error){
            console.error(error)
        }else{
            console.log(row)
            getDefensiveScore(row)
        }
    }


function getDefensiveScore(row) {
    const baseWeights = {
        TacklesPer90: 20,
        InterceptionsPer90: 25,
        BlockedShotsPer90: 15,
        Cleansheets: 40,
        GoalsConcededPer90: -180,
        ClearancesPer90: 15,
        AerialsWonPercentage: 30,
        DuelsWonPercentage: 40,
        DribbledPastPer90: -70,  // Base penalty
        ErrorLeadToGoal: -30,
    };

    const isDefender = player.position === 'Defender'
    const weights = { ...baseWeights };
    if (!isDefender) {
        weights.Cleansheets = 10;
        weights.GoalsConcededPer90 = -5;
    }

    const stats = {
        Tackles: row.Tackles || 0,
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

    const minutesMultiplier = Math.min(1, minutesPlayed / 1000);
    defensiveScore *= minutesMultiplier;

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
        const exponent = 2;       // Adjust the shape of the curve (higher = faster increase)
        const maxPenalty = 250;    // Cap on the penalty

        dribbledPastPenalty = Math.min(basePenalty + scaleFactor * Math.pow(dribbledPast, exponent), maxPenalty);
        defensiveScore -= dribbledPastPenalty;
    }

    defense = defensiveScore.toFixed(2);
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
                <div class="image-section">
                    {#if player.image_path}
                        <img src={player.image_path} alt={player.display_name} class="player-photo" />
                    {/if}
                    {#if player.nation_image}
                        <img src={player.nation_image} alt={player.nationality} class="nation-image" />
                    {/if}
                    <span>{player.detailedPosition}</span>
                    <span>Defensive Score: {defense}</span>
                </div>
                <div class="expanded-info">
                    <!-- Additional expanded info can go here -->
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
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
        gap: 2rem;
        align-items: center;
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

    .expanded-info {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
</style>