<script>
    import axios from "axios";
    import { supabase } from "./supabase/supaClient";
    import { getKeeperScore, getAttackingScore, getDefensiveScore, getPassingScore, getPossessionScore } from "./utils/playerCalcs";
    import Page from "../routes/+page.svelte";
    let {
        player = {
            id: 0,
            player_name: '',
            transfer_value: '',
            player_team: '',
            position: '',
            detailed_position: '',
            player_age: '',
            nationality: '',
            nation_image: '',
            defensive_score: '',
            passing_score: '',
            possession_score: '',
            attacking_score: '',
            total_score: '',
            keeper_score: ''
            
        }
    } = $props()

    
    let isExpanded = $state(false);
    // let keeping = $state(0)
    // let defense = $state(0)
    // let passing = $state(0)
    // let possession = $state(0)
    // let attacking = $state(0)
    // let total = $state(0)

    const isKeeper = player.position === 'Goalkeeper';
    const isDefender = player.position === 'Defender';
    const isFullback = player.detailed_position === 'Right Back' || player.detailed_position === 'Left Back';
    const isMidfielder = player.position === 'Midfielder';
    const isAttacker = player.position === 'Attacker';
    const isACM = player.detailed_position === 'Attacking Midfield';
    const isCB = player.detailed_position === 'Centre Back';

    function capScore(score) {
        return Math.min(score, 5000);
    }

    
    function toggleExpand() {
        isExpanded = !isExpanded;
        if (isExpanded){
            console.log(player.id)
            // getCalcScores(player.id)
            getPlayerStats(player.id)
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

        
//     async function getCalcScores(id) {
//         let { data: row, error } = await supabase
//             .from('prem_stats_2425')
//             .select('*')
//             .eq('id', id)
//             .single();

//         if (error) {
//             console.error(error);
//         } else {
//             console.log(row);

//         if(!isKeeper){
//             defense = getDefensiveScore(row, player.position, player.detailedPosition);
//             defense = capScore(defense);
//             total = parseFloat(defense);

//             passing = getPassingScore(row, player.position, player.detailedPosition);
//             passing = capScore(passing);
//             total += parseFloat(passing);

//             possession = getPossessionScore(row, player.position, player.detailedPosition);
//             possession = capScore(possession); 
//             total += parseFloat(possession);

//             attacking = getAttackingScore(row, player.position, player.detailedPosition);
//             attacking = capScore(attacking);
//             total += parseFloat(attacking);
            
//             if (isMidfielder){
//                 total *= 1.2
//             }
//             else if (isAttacker){
//                 total *= 1.3
//             }
//             else if (isCB) {
//                 total *= 1.4
//             }
//             else if (isFullback){
//                 total *= 0.95
//             }
//             total = (total / 4).toFixed(2);
//         }else {
//             keeping = getKeeperScore(row);
//             keeping = capScore(keeping)
//             total += parseFloat(keeping)

//             passing = getPassingScore(row, player.position, player.detailedPosition);
//             passing = capScore(passing);
//             total += parseFloat(passing);

//             total = (total / 2).toFixed(2)
//         }
//     }
// }

async function getPlayerStats(id){
        try {
            const lad = await axios.get(`/api/players/${id}`,{
                params: {
                    include: 'statistics.details.type',
                    filter: 'playerStatisticSeasons:23614'
                }
            })

            const playerData = lad.data.data; 
            console.log(playerData)
            player.image_path = playerData.image_path
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
            <h3>{player.player_name}</h3>
            <h2>€{player.transfer_value.toFixed(0)}</h2>
        </div>
        <div class="details">
            <span>{player.player_age} yrs</span>
            <span>{player.nationality}</span>
            <span>{player.player_team}</span>
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
                    <span class="detailed-position">{player.detailed_position}</span>
                </div>
            </div>
            <div class="stats-section">
                {#if !isKeeper}
                <div class="score">
                    <span>Defensive Score:</span>
                    <div class="progress-bar-container">
                        <div class="progress-bar">
                            <div class="progress" style={`width: ${(player.defensive_score / 5000) * 100}%;`}></div>
                        </div>
                        <div class="popup">{player.defensive_score}</div>
                    </div>
                </div>
                <div class="score">
                    <span>Passing Score:</span>
                    <div class="progress-bar-container">
                        <div class="progress-bar">
                            <div class="progress" style={`width: ${(player.passing_score / 5000) * 100}%;`}></div>
                        </div>
                        <div class="popup">{player.passing_score}</div>
                    </div>
                </div>
                <div class="score">
                    <span>Possession Score:</span>
                    <div class="progress-bar-container">
                        <div class="progress-bar">
                            <div class="progress" style={`width: ${(player.possession_score / 5000) * 100}%;`}></div>
                        </div>
                        <div class="popup">{player.possession_score}</div>
                    </div>
                </div>
                <div class="score">
                    <span>Attacking Score:</span>
                    <div class="progress-bar-container">
                        <div class="progress-bar">
                            <div class="progress" style={`width: ${(player.attacking_score / 5000) * 100}%;`}></div>
                        </div>
                        <div class="popup">{player.attacking_score}</div>
                    </div>
                </div>
                <div class="score">
                    <span>Overall Rating:</span>
                    <div class="progress-bar-container">
                        <div class="progress-bar">
                            <div class="progress" style={`width: ${(player.total_score / 5000) * 100}%;`}></div>
                        </div>
                        <div class="popup">{player.total_score}</div>
                    </div>
                </div>
                {:else}
                <div class="score">
                    <span>Keeping Score:</span>
                    <div class="progress-bar-container">
                        <div class="progress-bar">
                            <div class="progress" style={`width: ${(player.keeper_score / 5000) * 100}%;`}></div>
                        </div>
                        <div class="popup">{player.keeper_score}</div>
                    </div>
                </div>
                <div class="score">
                    <span>Passing Score:</span>
                    <div class="progress-bar-container">
                        <div class="progress-bar">
                            <div class="progress" style={`width: ${(player.passing_score / 5000) * 100}%;`}></div>
                        </div>
                        <div class="popup">{player.passing_score}</div>
                    </div>
                </div>
                <div class="score">
                    <span>Overall Rating:</span>
                    <div class="progress-bar-container">
                        <div class="progress-bar">
                            <div class="progress" style={`width: ${(player.total_score / 5000) * 100}%;`}></div>
                        </div>
                        <div class="popup">{player.total_score}</div>
                    </div>
                </div>
                {/if}
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
        display: inline-block; 
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
        left: 0; 
        top: 100%; 
        transform: translateY(5px); 
        padding: 5px 10px;
        background-color: #333;
        color: #fff;
        border-radius: 4px;
        font-size: 0.9rem;
        white-space: nowrap;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        z-index: 1; 
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