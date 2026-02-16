<script lang="ts">
    import { getCountry } from '$lib/data/countries';
    import { teamIdsToName, playersByID } from "$lib/stores/generic.svelte";
    import { getCountryUrl } from '$lib/data/countryImages';
    import { calculateAge } from '$lib/utils';
    import { getSeasonID } from '$lib/stores/league.svelte';

    let { data } = $props();
    const player = data.player;

    const frontend_player = playersByID[player.id];

    let nationImage = player ? getCountryUrl(getCountry(player.nationality_id)) : null;

    const fantasyStats = data.fantasyStats;

    const seasonID = getSeasonID();
    const seasonStats = player?.statistics?.find((s: any) => s.season_id === seasonID);
    const details = seasonStats?.details ?? [];

    const isKeeper = frontend_player?.detailed_position === 'Goalkeeper';

    function getStat(developerName: string): any {
        return details.find((d: any) => d.type.developer_name === developerName);
    }

    function formatValue(val: any): string {
        if (val == null) return '-';
        if (typeof val === 'number') {
            if (Number.isInteger(val)) return val.toString();
            return val.toFixed(1);
        }
        return String(val);
    }

    function getStatValue(developerName: string, key = 'total'): string {
        const stat = getStat(developerName);
        if (!stat) return '-';
        const val = stat.value[key] ?? stat.value.total ?? stat.value.average;
        return formatValue(val);
    }

    const realStatGrid = [
        { label: 'Minutes Played', key: 'MINUTES_PLAYED' },
        { label: 'Appearances', key: 'APPEARANCES' },
        { label: 'Goals', key: 'GOALS' },
        { label: 'Assists', key: 'ASSISTS' },
        { label: 'Big Chances Created', key: 'BIG_CHANCES_CREATED' },
        { label: 'Pass Accuracy %', key: 'ACCURATE_PASSES_PERCENTAGE' },
        { label: 'Key Passes', key: 'KEY_PASSES' },
        { label: 'Errors to Goal', key: 'ERROR_LEAD_TO_GOAL' },
    ];

    let fantasyStatGrid = $derived.by(() => {
        if (!fantasyStats) return [];
        if (isKeeper) {
            return [
                { label: 'Appearances', value: fantasyStats.appearances },
                { label: 'Clean Sheets', value: fantasyStats.clean_sheets },
            ];
        }
        return [
            { label: 'Goals', value: fantasyStats.goals },
            { label: 'Assists', value: fantasyStats.assists },
            { label: 'Appearances', value: fantasyStats.appearances },
        ];
    });

    const MAX_SCORE = 5000;

    const allScoreBars = [
        { label: 'Defensive', key: 'defensive_score', color: '#2563eb' },
        { label: 'Passing', key: 'passing_score', color: '#16a34a' },
        { label: 'Possession', key: 'possession_score', color: '#9333ea' },
        { label: 'Attacking', key: 'attacking_score', color: '#ea580c' },
        { label: 'Finishing', key: 'finishing_score', color: '#e11d48' },
        { label: 'Keeper', key: 'keeper_score', color: '#0891b2' },
    ];

    let scoreBars = $derived.by(() => {
        if (!frontend_player) return [];
        if (isKeeper) {
            return allScoreBars.filter(b => b.key === 'keeper_score' || b.key === 'passing_score');
        }
        return allScoreBars.filter(b => b.key !== 'keeper_score');
    });

    function getBarWidth(val: number | null): string {
        if (val == null || val <= 0) return '0%';
        return `${Math.min((val / MAX_SCORE) * 100, 100)}%`;
    }
</script>

<div class="player-page">
    {#if data.error}
        <p class="error">{data.error}</p>
    {:else if player}
        <div class="player-header">
            <div class="player-avatar">
                {#if nationImage}
                    <img src={nationImage} alt={player.display_name} class="nation-flag" />
                {:else}
                    <div class="flag-placeholder">?</div>
                {/if}
            </div>
            <div class="player-info">
                <div class="player-info-top">
                    <h1>{player.display_name}</h1>
                    {#if frontend_player?.player_team}
                        <span class="player-team">{frontend_player.player_team}</span>
                    {/if}
                </div>
                <div class="player-details">
                    <span>Age: {calculateAge(player.date_of_birth)}</span>
                    <span>Height: {player.height} cm</span>
                    <span>{frontend_player?.detailed_position ?? 'Unknown'}</span>
                </div>
            </div>
        </div>

        <!-- Score Bars -->
        {#if frontend_player}
            <div class="score-bars-section">
                <h3 class="section-title">Player Scores</h3>
                <div class="score-bars">
                    {#each scoreBars as bar}
                        {@const val = frontend_player[bar.key]}
                        <div class="score-bar-row">
                            <span class="bar-label">{bar.label}</span>
                            <div class="bar-track">
                                <div
                                    class="bar-fill"
                                    style="width: {getBarWidth(val)}; background: {bar.color};"
                                ></div>
                            </div>
                            <span class="bar-value" style="color: {bar.color};">
                                {val != null ? formatValue(val) : '-'}
                            </span>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        <!-- Real Stats -->
        <div class="statistics-section">
            <h3 class="section-title">Real Stats</h3>
            {#if details.length > 0}
                <div class="stat-grid">
                    {#each realStatGrid as stat}
                        <div class="stat-box">
                            <span class="stat-label">{stat.label}</span>
                            <span class="stat-value">{getStatValue(stat.key)}</span>
                        </div>
                    {/each}
                </div>
            {:else}
                <p class="placeholder-text">No statistics found for this season.</p>
            {/if}
        </div>

        <!-- Fantasy Stats -->
        <div class="statistics-section">
            <h3 class="section-title">Fantasy Stats</h3>
            {#if fantasyStatGrid.length > 0}
                <div class="stat-grid">
                    {#each fantasyStatGrid as stat}
                        <div class="stat-box">
                            <span class="stat-label">{stat.label}</span>
                            <span class="stat-value">{formatValue(stat.value)}</span>
                        </div>
                    {/each}
                </div>
            {:else}
                <p class="placeholder-text">No fantasy stats available.</p>
            {/if}
        </div>
    {:else}
        <p>Player not found</p>
    {/if}
</div>

<style>
    .player-page {
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
    }
    .player-header {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        margin-bottom: 2rem;
    }
    .player-avatar {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        overflow: hidden;
        border: 3px solid #ddd;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f5f5f5;
        flex-shrink: 0;
    }
    .nation-flag {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    .flag-placeholder {
        font-size: 2rem;
        color: #999;
    }
    .player-info h1 {
        margin: 0 0 0.5rem 0;
        font-size: 1.75rem;
    }
    .player-details {
        display: flex;
        gap: 1.5rem;
        color: #555;
        font-size: 0.95rem;
    }
    .statistics-section {
        border-top: 1px solid #eee;
        padding-top: 1.5rem;
    }
    .stat-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1rem;
    }
    .stat-box {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 1.25rem 0.75rem;
        background: #f9f9f9;
        border-radius: 8px;
        border: 1px solid #eee;
    }
    .stat-label {
        font-size: 0.75rem;
        color: #888;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        margin-bottom: 0.4rem;
        text-align: center;
    }
    .stat-value {
        font-size: 1.75rem;
        font-weight: 700;
        color: #222;
    }
    .placeholder-text {
        color: #888;
        font-style: italic;
    }
    .error {
        color: #dc2626;
    }

    .player-info-top {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 1rem;
    }

    .player-team {
        font-size: 0.8rem;
        color: #aaa;
        font-weight: 400;
        white-space: nowrap;
    }

    .section-title {
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #999;
        margin: 0 0 0.75rem 0;
        font-weight: 600;
    }


    .score-bars-section {
        margin-bottom: 1.5rem;
        padding-bottom: 1.5rem;
        border-bottom: 1px solid #eee;
    }

    .score-bars {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .score-bar-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .bar-label {
        width: 80px;
        font-size: 0.78rem;
        color: #666;
        text-align: right;
        flex-shrink: 0;
    }

    .bar-track {
        flex: 1;
        height: 10px;
        background: #f0f0f0;
        border-radius: 5px;
        overflow: hidden;
    }

    .bar-fill {
        height: 100%;
        border-radius: 5px;
        transition: width 0.4s ease;
    }

    .bar-value {
        width: 50px;
        font-size: 0.8rem;
        font-weight: 600;
        text-align: right;
        flex-shrink: 0;
    }

    /* Fantasy placeholder */
    .stat-box.placeholder {
        opacity: 0.45;
        border-style: dashed;
    }
</style>