<script lang="ts">
    import { getCountry } from '$lib/data/countries';
    import { getCountryUrl } from '$lib/data/countryImages';
    import { calculateAge } from '$lib/utils';
    import { getSeasonID } from '$lib/stores/league.svelte';

    let { data } = $props();
    const player = data.player;
    let nationImage = player ? getCountryUrl(getCountry(player.nationality_id)) : null;

    const seasonID = getSeasonID();
    const seasonStats = player?.statistics?.find((s: any) => s.season_id === seasonID);
    const details = seasonStats?.details ?? [];

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

    const statGrid = [
        { label: 'Minutes Played', key: 'MINUTES_PLAYED' },
        { label: 'Appearances', key: 'APPEARANCES' },
        { label: 'Goals', key: 'GOALS' },
        { label: 'Assists', key: 'ASSISTS' },
        { label: 'Big Chances Created', key: 'BIG_CHANCES_CREATED' },
        { label: 'Pass Accuracy %', key: 'ACCURATE_PASSES_PERCENTAGE' },
        { label: 'Key Passes', key: 'KEY_PASSES' },
        { label: 'Errors to Goal', key: 'ERROR_LEAD_TO_GOAL' },
    ];
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
                <h1>{player.display_name}</h1>
                <div class="player-details">
                    <span>Age: {calculateAge(player.date_of_birth)}</span>
                    <span>Height: {player.height} cm</span>
                    <span>Weight: {player.weight} kg</span>
                </div>
            </div>
        </div>
        <div class="statistics-section">
            {#if details.length > 0}
                <div class="stat-grid">
                    {#each statGrid as stat}
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
</style>