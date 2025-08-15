<script>
    import axios from "axios";
    import { supabase } from "./supabase/supaClient";
    import { draft } from "./stores/draft.svelte";
    import { delay } from "./utils";
    import { getPlayerPicture } from "./api/sportsmonk/utils/apiUtils.svelte";
    import { playerTeam } from "./stores/teams.svelte";
    import { nonPer90Stats } from "./data/nonPer90Stats";
    import NotableStat from "./NotableStat.svelte";
    import { defenseWeightMap, passingWeightMap, possessionWeightMap, attackingWeightMap, keepingWeightMap, keepingImpMap, defenseImpMap, possessionImpMap, passingImpMap, attackingImpMap, finishingWeightMap, finishingImpMap } from "./stores/generic.svelte";
    import Page from "../routes/+page.svelte";
    import { error } from "@sveltejs/kit";
	import PlayerDraftTeam from "./PlayerDraftTeam.svelte";

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
            image_path: '',
            nation_image: '',
            defensive_score: '',
            passing_score: '',
            possession_score: '',
            attacking_score: '',
            total_score: '',
            keeper_score: '',
            tackles: '',
            minutes: '',
            aerial: '',
            shotsOff: '',
            shotsOn: '',
            shots: '',
            offsides: '',
            goals: '',
            shotsBlocked: '',
            hitWood: '',
            assists: '',
            passes: '',
            goalsConc: '',
            disposs: '',
            fouls: '',
            foulsDr: '',
            blockedShots: '',
            accCrosses: '',
            intercept: '',
            clear: '',
            duelsPerc: '',
            succDrib: '',
            dribPast: '',
            errorToGoal: 0,
            keyP: '',
            rating: '',
            lbWon: '',
            clean: '',
            bigCr: '',
            bigMis: '',
            accPPerc: '',
            cBlocked: ''
        },
        onDraft
    } = $props();

    let statted = $state(false)
    let isExpanded = $state(false);
    let expandedSection = $state(null);
    let totalDuels = $state(0);
    let duelsWon = $state(0);
    let sortedDefStats = $state([]);
    let sortedPossStats = $state([]);
    let sortedPassStats = $state([]);
    let sortedAttStats = $state([]);
    let sortedFinStats = $state([]);
    let sortedKprStats = $state([]);
    let playerRankings = $state({})
    let notableStats = $state([])
    let activeTab = $state('notables')

    const isKeeper = player.position === 'Goalkeeper';

    // Configuration mapping for player properties and importance assignments
    const statConfig = {
        'TacklesPer90': ['tackles', [defenseImpMap, sortedDefStats, defenseWeightMap]],
        'AerialsWonPer90': ['aerial', [defenseImpMap, sortedDefStats, defenseWeightMap]],
        'ShotsOffTargetPer90': ['shotsOff', [attackingImpMap, sortedAttStats, attackingWeightMap], [possessionImpMap, sortedPossStats, possessionWeightMap], [finishingImpMap, sortedFinStats, finishingWeightMap]],
        'ShotsOnTargetPer90': ['shotsOn', [attackingImpMap, sortedAttStats, attackingWeightMap],[finishingImpMap, sortedFinStats, finishingWeightMap]],
        'ShotsTotal': ['shots'],
        'OffsidesPer90': ['offsides', [attackingImpMap, sortedAttStats, attackingWeightMap], [possessionImpMap, sortedPossStats, possessionWeightMap], [finishingImpMap, sortedFinStats, finishingWeightMap]],
        'GoalsPer90': ['goals', [attackingImpMap, sortedAttStats, attackingWeightMap], [finishingImpMap, sortedFinStats, finishingWeightMap]],
        'ShotsBlockedPer90': ['shotsBlocked', [attackingImpMap, sortedAttStats, attackingWeightMap], [finishingImpMap, sortedFinStats, finishingWeightMap]],
        'HitWoodworkPer90': ['hitWood', [attackingImpMap, sortedAttStats, attackingWeightMap], [finishingImpMap, sortedFinStats, finishingWeightMap]],
        'AssistsPer90': ['assists', [passingImpMap, sortedPassStats, passingWeightMap], [attackingImpMap, sortedAttStats, attackingWeightMap]],
        'PassesPer90': ['passes', [passingImpMap, sortedPassStats, passingWeightMap], [possessionImpMap, sortedPossStats, possessionWeightMap]],
        'GoalsConcededPer90': ['goalsConc', [defenseImpMap, sortedDefStats, defenseWeightMap], [keepingImpMap, sortedKprStats, keepingWeightMap]],
        'DispossessedPer90': ['disposs', [possessionImpMap, sortedPossStats, possessionWeightMap]],
        'FoulsPer90': ['fouls', [defenseImpMap, sortedDefStats, defenseWeightMap], [possessionImpMap, sortedPossStats, possessionWeightMap]],
        'FoulsDrawnPer90': ['foulsDr', [possessionImpMap, sortedPossStats, possessionWeightMap]],
        'BlockedShotsPer90': ['blockedShots', [defenseImpMap, sortedDefStats, defenseWeightMap]],
        'AccurateCrossesPer90': ['accCrosses', [passingImpMap, sortedPassStats, passingWeightMap]],
        'InterceptionsPer90': ['intercept', [defenseImpMap, sortedDefStats, defenseWeightMap]],
        'ClearancesPer90': ['clear', [defenseImpMap, sortedDefStats, defenseWeightMap]],
        'SuccessfulDribblesPer90': ['succDrib', [attackingImpMap, sortedAttStats, attackingWeightMap], [possessionImpMap, sortedPossStats, possessionWeightMap]],
        'DribbledPastPer90': ['dribPast', [defenseImpMap, sortedDefStats, defenseWeightMap]],
        'ErrorLeadToGoal': ['errorToGoal', [defenseImpMap, sortedDefStats, defenseWeightMap], [keepingImpMap, sortedKprStats, keepingWeightMap]],
        'KeyPassesPer90': ['keyP', [passingImpMap, sortedPassStats, passingWeightMap], [possessionImpMap, sortedPossStats, possessionWeightMap]],
        'Rating': ['rating'],
        'LongBallsWonPer90': ['lbWon', [defenseImpMap, sortedDefStats, defenseWeightMap], [possessionImpMap, sortedPossStats, possessionWeightMap]],
        'Cleansheets': ['clean', [defenseImpMap, sortedDefStats, defenseWeightMap], [keepingImpMap, sortedKprStats, keepingWeightMap]],
        'BigChancesCreatedPer90': ['bigCr', [passingImpMap, sortedPassStats, passingWeightMap], [possessionImpMap, sortedPossStats, possessionWeightMap]],
        'BigChancesMissedPer90': ['bigMis', [attackingImpMap, sortedAttStats, attackingWeightMap], [finishingImpMap, sortedFinStats, finishingWeightMap]],
        'AccuratePassesPercentage': ['accPPerc', [possessionImpMap, sortedPossStats, possessionWeightMap]],
        'CrossesBlockedPer90': ['cBlocked', [defenseImpMap, sortedDefStats, defenseWeightMap]],
    };

    async function handleDraftClick(e){
        e.stopPropagation();
        if(player.image_path === '' || player.image_path === undefined || player.image_path === null){
            player.image_path = await getPlayerPicture(player.id)
        }
        if(isExpanded){
            isExpanded = !isExpanded
            delay(200) //Force component to close if open. Probably not necessary due to the #each being keyed on player.id
        }
        
        onDraft(player.image_path)
    }

    function capScore(score) {
        return Math.min(score, 5000);
    }

    function setActiveTab(tab){
        activeTab = tab
    }

    function toggleSection(section) {
        if (expandedSection === section) {
            expandedSection = null;
        } else {
            expandedSection = section;
        }
    }

    async function toggleExpand() {
        isExpanded = !isExpanded;
        if (isExpanded && !statted) {
            await getPlayerRankings(player.id);
            await getPlayerStats(player.id);
            // getPlayerStatsDB(player.id)
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

    function condenseString(str) {
        return str.replace(/\s/g, '');
    }

    function calculatePer90(statValue, minutes) {
        return minutes > 0 ? ((statValue / minutes) * 90).toFixed(2) : 0;
    }

    function sortStatsByImportance(statArray) {
        statArray.sort((a, b) => Math.abs(b.importanceValue) - Math.abs(a.importanceValue));
        // console.log(`stat array`, statArray);
    }

    function assignImportances(statName, statValue, detailedPosition, impMap, sortedArray) {
        // console.log(`impMap`, impMap)
        const importanceValue = impMap[detailedPosition]?.[statName] || 0;

        sortedArray.push({
            name: statName,
            importanceValue: importanceValue,
            value: statValue
        });
    }

    function processStat(statName, statValue, minutes) {
        let displayValue;
        let p90;
        if (nonPer90Stats.has(statName)) {
            displayValue = statValue;
            statName = condenseString(statName);
            p90 = false
        } else {
            displayValue = calculatePer90(statValue, minutes);
            statName = condenseString(statName) + 'Per90';
            p90 = true
        }

        const config = statConfig[statName] || [];
        if (config[0]) {
            // Assign the value to the corresponding player property
            player[config[0]] = displayValue;
      

        const maps = config.slice(1);
        

        maps.forEach(([impMap, sortedArray, weightMap]) => {
            assignImportances(statName, displayValue, player.detailed_position, impMap, sortedArray);
            rankedScore(statName, displayValue, weightMap, player.detailed_position, p90)
        });
        }
    }

    function rankedScore(statName, statValue, weightMap, position, p90){
        if (playerRankings[statName] !== null && playerRankings[statName] !== 0 && statName !== 'ErrorLeadToGoal'){           
            const rank = playerRankings[statName]
           
            const weightObj = weightMap[position]

            const weight = weightObj[statName]

            const flatRank = (rank >= 0)
                ? (51 - rank ) / 50
                : (51 + rank) / 50;

            const absWeight = Math.abs(weight)

            // console.log(statName, absWeight)

            const normalizedWeight = absWeight / 3000;

            let score = flatRank * normalizedWeight
           

            notableStats.push([statName, score, rank, statValue, p90])
            // console.log(notableStats)
        }
    }

    function selectNotables(){
        notableStats.sort((a, b) => b[1] - a[1])
        console.log(`sorted: `, notableStats)

        const seenStats = new Set()
        let wIndex = 0;

        for (let rIndex = 0; rIndex < notableStats.length; rIndex++) {
            const [statName] = notableStats[rIndex];

            // If the stat hasn't been seen yet, keep it. Stats can appear twice for being calculated in two different categories.
            if (!seenStats.has(statName)) {
                // Move the unique stat to the current writeIndex
                notableStats[wIndex] = notableStats[rIndex];
                seenStats.add(statName);
                wIndex++;

                // Stop once we have 5 unique stats
                if (wIndex === 5) {
                    break;
                }
            }
        }

        notableStats.length = wIndex;
        console.log('sorted notables: ', notableStats)
        colorizeNotables()
    }

    function colorizeNotables() {
        notableStats.forEach(stat => {
            const rank = stat[2]; // Ranking is the third item in the array
            let color;

            if (rank === 1) {
                color = "#6A5ACD"; // Muted Purple (Slate Blue)
            } else if (rank >= 2 && rank <= 5) {
                color = "#4682B4"; // Muted Blue (Steel Blue)
            } else if (rank >= 6 && rank <= 10) {
                color = "#32CD32"; // Muted Green (Lime Green)
            } else if (rank >= 11 && rank <= 20) {
                color = "#556B2F"; // Muted Dark Green (Dark Olive Green)
            } else if (rank >= 21 && rank <= 50) {
                color = "#9ACD32"; // Muted Yellow-Green (Yellow Green)
            } else if (rank === -1) {
                color = "#8B7355"; // Muted Brown (Burly Wood)
            } else if (rank >= -5 && rank <= -2) {
                color = "#CD5C5C"; // Muted Red (Indian Red)
            } else if (rank >= -10 && rank <= -6) {
                color = "#8B0000"; // Muted Dark Red (Dark Red)
            } else if (rank >= -20 && rank <= -11) {
                color = "#FF8C00"; // Muted Orange (Dark Orange)
            } else if (rank >= -50 && rank <= -21) {
                color = "#A9A9A9"; // Muted Yellow-Grey (Dark Gray)
            } else {
                color = "#808080"; // Muted Gray (Default color)
            }

            stat.push(color); // Add the color hex code to the end of the array
        });
    }
   

    // async function getPlayerStatsDB(id) {
    //     try {
    //         const { data, error } = await supabase
    //             .from('prem_stats_2425_per90')
    //             .select('*')
    //             .eq('id', id)
    //             .single()


    //         if (error) {
    //             console.error(error)
    //         }

          

    //         console.log(data)
    //         const minutes = data.MinutesPlayed
            
    //         if (minutes === null){
    //             console.log('No minutes for player, can not process stats')
    //             return
    //         }
    //         data.forEach(p90Stat => {
    //             const { stat, value } = p90Stat;
    //             processStat(stat, value, minutes)

    //         })
    //         sortStatsByImportance(sortedDefStats)
    //         sortStatsByImportance(sortedAttStats)
    //         sortStatsByImportance(sortedKprStats)
    //         sortStatsByImportance(sortedPassStats)
    //         sortStatsByImportance(sortedPossStats)
    //         statted = true
    //     } catch(error){
    //         console.error('Unexpected error', error)
    //     }
    // }

    async function getPlayerRankings(id) {
        try {
            const { data, error } = await supabase
                .from('prem_stats_2425_rankings')
                .select('*')
                .eq('id', id)
                .single()
            
            if (error){
                console.error('Supa error', error)
                return;
            }
            console.log(data)
            playerRankings = data
        }catch(err){
            console.log(`Error retrieving rankings`, err)
        }
    }

    async function getPlayerStats(id) {
        try {
            const lad = await axios.get(`/api/players/${id}`, {
                params: {
                    include: 'statistics.details.type',
                    filter: 'playerStatisticSeasons:23614'
                }
            });

            const playerData = lad.data.data;
            console.log(playerData);
            player.image_path = playerData.image_path;
            getNation(playerData.nationality_id);

            if (playerData && playerData.statistics && playerData.statistics.length > 0) {
                let minutes = 0;

                playerData.statistics[0].details.forEach(seasonStats => {
                    if (seasonStats.type.name === "Minutes Played") {
                        minutes = seasonStats.value.total || 0;
                    }
                });

                playerData.statistics[0].details.forEach(seasonStats => {
                    const { type, value } = seasonStats;
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

                    if (statValue !== null && statName !== "Minutes Played" && statName !== "Total Duels" && statName !== "Duels Won") {
                        processStat(statName, statValue, minutes);
                    } else if (statName === "Total Duels") {
                        totalDuels = statValue;
                    } else if (statName === "Duels Won") {
                        duelsWon = statValue;
                    }
                });

                if (!isKeeper && duelsWon !== 0 && totalDuels !== 0) {
                    player.duelsPerc = ((duelsWon / totalDuels) * 100).toFixed(2);
                    processStat('Duels Won Percentage', player.duelsPerc, minutes)
                }
                sortStatsByImportance(sortedDefStats)
                sortStatsByImportance(sortedAttStats)
                sortStatsByImportance(sortedKprStats)
                sortStatsByImportance(sortedPassStats)
                sortStatsByImportance(sortedPossStats)
                sortStatsByImportance(sortedFinStats)
                selectNotables()
                statted = true
            } else {
                console.log("No statistics found for this player.");
            }
        } catch (err) {
            console.error(err);
        }
    }

    async function getNation(id) {
        try {
            const nationRes = await axios.get(`api/core/countries/${id}`);
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
            {#if draft.currentTeam === playerTeam.name}
            <button 
                    class="draft-button"
                    onclick={handleDraftClick}
                    aria-label={`Draft ${player.player_name}`}
                >
                    Draft for €{player.transfer_value.toFixed(0)}
                </button>
            {:else}
            <h2>€{player.transfer_value.toFixed(0)}</h2>
            {/if}
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

                <!-- Tab Navigation -->
                <div class="tab-nav">
                    {#if notableStats[0[1]] !== NaN }
                        <div 
                            class="tab-nav-button"
                            role="button"
                            tabindex="0"
                            onkeydown={e => e.key === 'Shift' && setActiveTab('notables')}
                            class:active={activeTab === 'notables'} onclick={(e) => {
                                e.stopPropagation();
                                setActiveTab('notables')}}>
                                Notable Stats
                        </div>
                    {/if}
                    <div 
                        class="tab-nav-button"
                        role="button"
                        tabindex="0"
                        onkeydown={e => e.key === 'Shift' && setActiveTab('scores')}
                        class:active={activeTab === 'scores'} onclick={(e) => {
                            e.stopPropagation();
                            setActiveTab('scores')}}>
                            Detailed Scores
                    </div>
                </div>
                <!-- Notable Stats Tab -->
                {#if activeTab === 'notables'}
                    <div class="notable-section">
                        <!-- Header Row -->
                        <div class="notable-header">
                            <span>Stat Name</span>
                            <span style="text-align: right;">Value</span>
                            <span style="text-align: right;">{!isKeeper? `League Ranking` : `Keeper Ranking`}</span>
                        </div>
                        <!-- Stat Rows -->
                        {#each notableStats as [name, hiddenScore, ranking, value, p90, color]}
                            <div class={p90 === true ? "notable-wrapper" : "notable-nonavg-wrapper"}>
                            <NotableStat 
                                name={name}
                                hiddenScore={hiddenScore}
                                ranking={ranking}
                                value={value}
                                color={color}
                                position={player.detailed_position}
                                averageTracked={p90}
                            />
                            </div>
                        {/each}
                    </div>
                {/if}
                <!-- Scores Tab -->
                {#if activeTab === 'scores'}
                    <div class="stats-section">
                        {#if !isKeeper}
                            <!-- Defensive Score -->
                            <div class="score">
                                <div 
                                    role="button"
                                    tabindex="0"
                                    onkeydown={e => e.key === 'Shift' && toggleSection('defensive')}
                                    class="score-label" 
                                    onclick={(e) => {
                                        e.stopPropagation();
                                        toggleSection('defensive');
                                    }}
                                >
                                    <span>Defensive Score:</span>
                                    <span class="arrow-icon" style="margin-left: 1rem;">{expandedSection === 'defensive' ? '▲' : '▼'}</span>
                                </div>
                                <div class="progress-bar-container">
                                    <div class="progress-bar">
                                        <div class="progress" style={`width: ${(player.defensive_score / 5000) * 100}%;`}></div>
                                    </div>
                                    <div class="popup">{player.defensive_score}</div>
                                </div>
                            </div>
                            {#if expandedSection === 'defensive'}
                                <div class="expandable-section">
                                    <div class="stat-grid">
                                        {#each sortedDefStats as stat}
                                            <div class="stat-item">
                                                <span class="stat-name">{stat.name}:</span>
                                                <span class="stat-value">{stat.value}</span>
                                                <span class:stat-importance={stat.importanceValue > 0} class:stat-importance-neg={stat.importanceValue < 0}>
                                                    {stat.importanceValue > 0 ? '+'.repeat(stat.importanceValue) : '-'.repeat(Math.abs(stat.importanceValue))}
                                                </span>
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            {/if}

                            <!-- Passing Score -->
                            <div class="score">
                                <div 
                                    role="button"
                                    tabindex="0"
                                    onkeydown={e => e.key === 'Shift' && toggleSection('passing')}
                                    class="score-label" 
                                    onclick={(e) => {
                                        e.stopPropagation();
                                        toggleSection('passing');
                                    }}
                                >
                                    <span>Passing Score:</span>
                                    <span class="arrow-icon" style="margin-left: 1rem;">{expandedSection === 'passing' ? '▲' : '▼'}</span>
                                </div>
                                <div class="progress-bar-container">
                                    <div class="progress-bar">
                                        <div class="progress" style={`width: ${(player.passing_score / 5000) * 100}%;`}></div>
                                    </div>
                                    <div class="popup">{player.passing_score}</div>
                                </div>
                            </div>
                            {#if expandedSection === 'passing'}
                                <div class="expandable-section">
                                    <div class="stat-grid">
                                        {#each sortedPassStats as stat}
                                            <div class="stat-item">
                                                <span class="stat-name">{stat.name}:</span>
                                                <span class="stat-value">{stat.value}</span>
                                                <span class:stat-importance={stat.importanceValue > 0} class:stat-importance-neg={stat.importanceValue < 0}>
                                                    {stat.importanceValue > 0 ? '+'.repeat(stat.importanceValue) : '-'.repeat(Math.abs(stat.importanceValue))}
                                                </span>
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            {/if}

                            <!-- Possession Score -->
                            <div class="score">
                                <div 
                                    role="button"
                                    tabindex="0"
                                    onkeydown={e => e.key === 'Shift' && toggleSection('possession')}
                                    class="score-label" 
                                    onclick={(e) => {
                                        e.stopPropagation();
                                        toggleSection('possession');
                                    }}
                                >
                                    <span>Possession Score:</span>
                                    <span class="arrow-icon" style="margin-left: 1rem;">{expandedSection === 'possession' ? '▲' : '▼'}</span>
                                </div>
                                <div class="progress-bar-container">
                                    <div class="progress-bar">
                                        <div class="progress" style={`width: ${(player.possession_score / 5000) * 100}%;`}></div>
                                    </div>
                                    <div class="popup">{player.possession_score}</div>
                                </div>
                            </div>
                            {#if expandedSection === 'possession'}
                                <div class="expandable-section">
                                    <div class="stat-grid">
                                        {#each sortedPossStats as stat}
                                            <div class="stat-item">
                                                <span class="stat-name">{stat.name}:</span>
                                                <span class="stat-value">{stat.value}</span>
                                                <span class:stat-importance={stat.importanceValue > 0} class:stat-importance-neg={stat.importanceValue < 0}>
                                                    {stat.importanceValue > 0 ? '+'.repeat(stat.importanceValue) : '-'.repeat(Math.abs(stat.importanceValue))}
                                                </span>
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            {/if}

                            <!-- Attacking Score -->
                            <div class="score">
                                <div 
                                    role="button"
                                    tabindex="0"
                                    onkeydown={e => e.key === 'Shift' && toggleSection('attacking')}
                                    class="score-label" 
                                    onclick={(e) => {
                                        e.stopPropagation();
                                        toggleSection('attacking');
                                    }}
                                >
                                    <span>Attacking Score:</span>
                                    <span class="arrow-icon" style="margin-left: 1rem;">{expandedSection === 'attacking' ? '▲' : '▼'}</span>
                                </div>
                                <div class="progress-bar-container">
                                    <div class="progress-bar">
                                        <div class="progress" style={`width: ${(player.attacking_score / 5000) * 100}%;`}></div>
                                    </div>
                                    <div class="popup">{player.attacking_score}</div>
                                </div>
                            </div>
                            {#if expandedSection === 'attacking'}
                                <div class="expandable-section">
                                    <div class="stat-grid">
                                        {#each sortedAttStats as stat}
                                            <div class="stat-item">
                                                <span class="stat-name">{stat.name}:</span>
                                                <span class="stat-value">{stat.value}</span>
                                                <span class:stat-importance={stat.importanceValue > 0} class:stat-importance-neg={stat.importanceValue < 0}>
                                                    {stat.importanceValue > 0 ? '+'.repeat(stat.importanceValue) : '-'.repeat(Math.abs(stat.importanceValue))}
                                                </span>
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            {/if}

                            <!-- End Product Score -->
                            <div class="score">
                                <div 
                                    role="button"
                                    tabindex="0"
                                    onkeydown={e => e.key === 'Shift' && toggleSection('finishing')}
                                    class="score-label" 
                                    onclick={(e) => {
                                        e.stopPropagation();
                                        toggleSection('finishing');
                                    }}
                                >
                                    <span>Goalscoring:</span>
                                    <span class="arrow-icon" style="margin-left: 1rem;">{expandedSection === 'finishing' ? '▲' : '▼'}</span>
                                </div>
                                <div class="progress-bar-container">
                                    <div class="progress-bar">
                                        <div class="progress" style={`width: ${(player.finishing_score / 5000) * 100}%;`}></div>
                                    </div>
                                    <div class="popup">{player.finishing_score}</div>
                                </div>
                            </div>
                            {#if expandedSection === 'finishing'}
                                <div class="expandable-section">
                                    <div class="stat-grid">
                                        {#each sortedFinStats as stat}
                                            <div class="stat-item">
                                                <span class="stat-name">{stat.name}:</span>
                                                <span class="stat-value">{stat.value}</span>
                                                <span class:stat-importance={stat.importanceValue > 0} class:stat-importance-neg={stat.importanceValue < 0}>
                                                    {stat.importanceValue > 0 ? '+'.repeat(stat.importanceValue) : '-'.repeat(Math.abs(stat.importanceValue))}
                                                </span>
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            {/if}

                            <!-- Overall Rating -->
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
                            <!-- Keeper-specific scores -->
                            <div class="score">
                                <div 
                                    role="button"
                                    tabindex="0"
                                    onkeydown={e => e.key === 'Shift' && toggleSection('keeping')}
                                    class="score-label" 
                                    onclick={(e) => {
                                        e.stopPropagation();
                                        toggleSection('keeping');
                                    }}
                                >
                                    <span>Keeping Score:</span>
                                    <span class="arrow-icon" style="margin-left: 1rem;">{expandedSection === 'keeping' ? '▲' : '▼'}</span>
                                </div>
                                <div class="progress-bar-container">
                                    <div class="progress-bar">
                                        <div class="progress" style={`width: ${(player.keeper_score / 5000) * 100}%;`}></div>
                                    </div>
                                    <div class="popup">{player.keeper_score}</div>
                                </div>
                            </div>
                            {#if expandedSection === 'keeping'}
                                <div class="expandable-section">
                                    <div class="stat-grid">
                                        {#each sortedKprStats as stat}
                                            <div class="stat-item">
                                                <span class="stat-name">{stat.name}:</span>
                                                <span class="stat-value">{stat.value}</span>
                                                <span class:stat-importance={stat.importanceValue > 0} class:stat-importance-neg={stat.importanceValue < 0}>
                                                    {stat.importanceValue > 0 ? '+'.repeat(stat.importanceValue) : '-'.repeat(Math.abs(stat.importanceValue))}
                                                </span>
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            {/if}

                            <!-- Passing Score for Keepers -->
                            <div class="score">
                                <div 
                                    role="button"
                                    tabindex="0"
                                    onkeydown={e => e.key === 'Shift' && toggleSection('passing')}
                                    class="score-label" 
                                    onclick={(e) => {
                                        e.stopPropagation();
                                        toggleSection('passing');
                                    }}
                                >
                                    <span>Passing Score:</span>
                                    <span class="arrow-icon" style="margin-left: 1rem;">{expandedSection === 'passing' ? '▲' : '▼'}</span>
                                </div>
                                <div class="progress-bar-container">
                                    <div class="progress-bar">
                                        <div class="progress" style={`width: ${(player.passing_score / 5000) * 100}%;`}></div>
                                    </div>
                                    <div class="popup">{player.passing_score}</div>
                                </div>
                            </div>
                            {#if expandedSection === 'passing'}
                                <div class="expandable-section">
                                    <div class="stat-grid">
                                        {#each sortedPassStats as stat}
                                            <div class="stat-item">
                                                <span class="stat-name">{stat.name}:</span>
                                                <span class="stat-value">{stat.value}</span>
                                                <span class:stat-importance={stat.importanceValue > 0} class:stat-importance-neg={stat.importanceValue < 0}>
                                                    {stat.importanceValue > 0 ? '+'.repeat(stat.importanceValue) : '-'.repeat(Math.abs(stat.importanceValue))}
                                                </span>
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            {/if}

                            <!-- Overall Rating for Keepers -->
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
                {/if}
            </div>
        {/if}
    </div>
</div>
<style>
     .tab-nav {
        display: flex;
        gap: 1rem;
        margin-bottom: 0.8rem;
    }

    .draft-button {
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 0.5rem 1rem;
        font-size: 1.1rem;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s ease;
        margin-left: auto; /* Align to the right */
    }

    .draft-button:hover {
        background-color: #0069d9;
    }

    .draft-button:active {
        background-color: #005cbf;
    }

    .draft-button:focus {
        outline: none;
        box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.5);
    }

    .tab-nav-button  {
        padding: 0.5rem 1rem;
        border: none;
        background: #f0f0f0;
        cursor: pointer;
        border-radius: 4px;
    }

    .tab-nav-button.active {
        background: #007bff;
        color: white;
    }

    .notable-section {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
    }

    .notable-wrapper {
        border-radius: 5px;
    }

    .notable-wrapper:hover {
        background-color: #9e9393;
    }

    .notable-header {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr; /* Adjusted column widths */
        align-items: center;
        padding: 0.8rem;
        margin: 0.5rem;
        border-radius: 5px;
    }

    .notable-header {
        font-weight: bold;
        color: white;
        background-color: #333;
    }


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
        /* cursor: pointer; */
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

    h2 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 500;
        color: #706c6cb6;
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

    .score-label {
        display: flex;
    }

    .expandable-section {
        margin-top: 0.5rem;
        padding: 0.5rem;
        background-color: #f8fafc;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
    }

    .stat-grid {
        display: grid;
        grid-template-columns: 1fr auto auto; /* Three columns: stat name, value, importance */
        gap: 0.5rem; 
        align-items: center; /* Vertically align items */
    }

    .stat-item {
        display: contents; /* Make the children part of the grid */
    }

    .stat-name {
        font-weight: 500;
        color: #334155;
        text-align: left; 
    }

    .stat-value {
        text-align: center; 
        color: #475569;
        padding: 0 1rem; 
    }

    .stat-importance {
        text-align: right; 
        color: #4caf50;
        font-weight: bold;
    }

    .stat-importance-neg {
        text-align: right; 
        color: #e00a0a;
        font-weight: bold;
    }
</style>