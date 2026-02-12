<script lang="ts">
    import { getCountry } from '$lib/data/countries';
    import { getCountryUrl } from '$lib/data/countryImages';
    import { calculateAge } from '$lib/utils';

    let { data } = $props();

    const player = data.player;
    let nationImage = player ? getCountryUrl(getCountry(player.nationality_id)) : null;
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
            <p class="placeholder-text">Statistics breakdown coming soon</p>
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

    .statistics-section h2 {
        font-size: 1.25rem;
        margin-bottom: 0.75rem;
    }

    .placeholder-text {
        color: #888;
        font-style: italic;
    }

    .error {
        color: #dc2626;
    }
</style>