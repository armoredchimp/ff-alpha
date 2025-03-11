<script>
    import axios from "axios";
    import { supabase } from "./supabase/supaClient";
    import { keepingImpMap, defenseImpMap, possessionImpMap, passingImpMap, attackingImpMap } from "./stores/stores.svelte";
    import Page from "../routes/+page.svelte";
    import { error } from "@sveltejs/kit";

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
            keeper_score: '',
            tackles: '',
            minutes: '',
            aerial: '',
            shotsOff: '',
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
        }
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
    let sortedKprStats = $state([]);

    const isKeeper = player.position === 'Goalkeeper';

    const nonPer90Stats = new Set([
        'Error Lead To Goal',
        'Duels Won Percentage',
        'Rating',
        'Cleansheets',
        'Accurate Passes Percentage'
    ]);

    // Configuration mapping for player properties and importance assignments
    const statConfig = {
        'TacklesPer90': ['tackles', [defenseImpMap, sortedDefStats]],
        'AerialsWonPer90': ['aerial', [defenseImpMap, sortedDefStats]],
        'ShotsOffTargetPer90': ['shotsOff', [attackingImpMap, sortedAttStats], [possessionImpMap, sortedPossStats]],
        'ShotsTotal': ['shots'],
        'OffsidesPer90': ['offsides', [attackingImpMap, sortedAttStats], [possessionImpMap, sortedPossStats]],
        'GoalsPer90': ['goals', [attackingImpMap, sortedAttStats]],
        'ShotsBlockedPer90': ['shotsBlocked', [attackingImpMap, sortedAttStats]],
        'HitWoodworkPer90': ['hitWood', [attackingImpMap, sortedAttStats]],
        'AssistsPer90': ['assists', [attackingImpMap, sortedAttStats]],
        'PassesPer90': ['passes', [passingImpMap, sortedPassStats], [possessionImpMap, sortedPossStats]],
        'GoalsConcededPer90': ['goalsConc', [defenseImpMap, sortedDefStats], [keepingImpMap, sortedKprStats]],
        'DispossessedPer90': ['disposs', [possessionImpMap, sortedPossStats]],
        'FoulsPer90': ['fouls', [defenseImpMap, sortedDefStats], [possessionImpMap, sortedPossStats]],
        'FoulsDrawnPer90': ['foulsDr', [possessionImpMap, sortedPossStats]],
        'BlockedShotsPer90': ['blockedShots', [defenseImpMap, sortedDefStats]],
        'AccurateCrossesPer90': ['accCrosses', [passingImpMap, sortedPassStats]],
        'InterceptionsPer90': ['intercept', [defenseImpMap, sortedDefStats]],
        'ClearancesPer90': ['clear', [defenseImpMap, sortedDefStats]],
        'SuccessfulDribblesPer90': ['succDrib', [attackingImpMap, sortedAttStats], [possessionImpMap, sortedPossStats]],
        'DribbledPastPer90': ['dribPast', [defenseImpMap, sortedDefStats]],
        'ErrorLeadToGoal': ['errorToGoal', [defenseImpMap, sortedDefStats], [keepingImpMap, sortedKprStats]],
        'KeyPassesPer90': ['keyP', [passingImpMap, sortedPassStats], [possessionImpMap, sortedPossStats]],
        'Rating': ['rating'],
        'LongBallsWonPer90': ['lbWon', [defenseImpMap, sortedDefStats], [possessionImpMap, sortedPossStats]],
        'Cleansheets': ['clean', [defenseImpMap, sortedDefStats], [keepingImpMap, sortedKprStats]],
        'BigChancesCreatedPer90': ['bigCr', [passingImpMap, sortedPassStats], [possessionImpMap, sortedPossStats]],
        'BigChancesMissedPer90': ['bigMis', [attackingImpMap, sortedAttStats]],
        'AccuratePassesPercentage': ['accPPerc', [possessionImpMap, sortedPossStats]],
        'CrossesBlockedPer90': ['cBlocked', [defenseImpMap, sortedDefStats]],
    };


    function capScore(score) {
        return Math.min(score, 5000);
    }

    function toggleSection(section) {
        if (expandedSection === section) {
            expandedSection = null;
        } else {
            expandedSection = section;
        }
    }

    function toggleExpand() {
        isExpanded = !isExpanded;
        if (isExpanded && !statted) {
            getPlayerStats(player.id);
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
        if (nonPer90Stats.has(statName)) {
            displayValue = statValue;
            statName = condenseString(statName);
        } else {
            displayValue = calculatePer90(statValue, minutes);
            statName = condenseString(statName) + 'Per90';
        }

        const config = statConfig[statName] || [];
        if (config[0]) {
            // Assign the value to the corresponding player property
            player[config[0]] = displayValue;
      

        const maps = config.slice(1);

        maps.forEach(([impMap, sortedArray]) => {
            assignImportances(statName, displayValue, player.detailed_position, impMap, sortedArray);
        });
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
                statted = true
                // console.log(`sorted attack array: `, sortedAttStats)
            } else {
                console.log("No statistics found for this player.");
            }
        } catch (err) {
            console.error(err);
        }
    }

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
                    <div 
                        role="button"
                        tabindex="0"
                        onkeydown={e => e.key === 'Shift' && toggleSection('defensive')}
                        class="score-label" 
                        onclick={(e) => {
                            e.stopPropagation();
                            toggleSection('defensive')}}>
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
                <div class="score">
                    <div 
                        role="button"
                        tabindex="0"
                        onkeydown={e => e.key === 'Shift' && toggleSection('passing')}
                        class="score-label" 
                        onclick={(e) => {
                            e.stopPropagation();
                            toggleSection('passing')}}>
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
                <div class="score">
                    <div 
                        role="button"
                        tabindex="0"
                        onkeydown={e => e.key === 'Shift' && toggleSection('possession')}
                        class="score-label" 
                        onclick={(e) => {
                            e.stopPropagation();
                            toggleSection('possession')}}>
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
                <div class="score">
                    <div 
                        role="button"
                        tabindex="0"
                        onkeydown={e => e.key === 'Shift' && toggleSection('attacking')}
                        class="score-label" 
                        onclick={(e) => {
                            e.stopPropagation();
                            toggleSection('attacking')}}>
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
                    <div 
                        role="button"
                        tabindex="0"
                        onkeydown={e => e.key === 'Shift' && toggleSection('keeping')}
                        class="score-label" 
                        onclick={(e) => {
                            e.stopPropagation();
                            toggleSection('keeping')}}>
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
                <div class="score">
                    <div 
                        role="button"
                        tabindex="0"
                        onkeydown={e => e.key === 'Shift' && toggleSection('passing')}
                        class="score-label" 
                        onclick={(e) => {
                            e.stopPropagation();
                            toggleSection('passing')}}>
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
    .expanded-info {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        gap: 1rem;
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