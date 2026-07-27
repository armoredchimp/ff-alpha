<script lang="ts">
    import { getCountryUrl } from "./data/countryImages";
    import { getPlayerRatingColor } from "./utils/ratingColor";
    import type { Player } from "$lib/types/types";

    let {
        player = null as Player | null,
        currentPosition = '',
        bundlePlayer = null as any,       // players[player_id] from the match bundle
        onHover = null as ((id: number | null) => void) | null
    } = $props<{
        player?: Player | null;
        currentPosition?: string;
        bundlePlayer?: any;
        onHover?: ((id: number | null) => void) | null;
    }>();

    // Rating colour from the player's 1-2 fixtures, collapsed via favored weighting.
    const rating = $derived(
        getPlayerRatingColor(
            bundlePlayer?.statsRows ?? [],
            bundlePlayer?.fantasy?.favored_fixture_id ?? null
        )
    );

    const nationImage = $derived(player?.nationality ? getCountryUrl(player.nationality) : null);

    function enter() {
        if (player && onHover) onHover(player.id);
    }
    function leave() {
        if (onHover) onHover(null);
    }
</script>

{#if player}
    <div
        class="pm-player"
        class:did-not-play={rating.didNotPlay}
        role="presentation"
        onmouseenter={enter}
        onmouseleave={leave}
    >
        <div class="pm-ring" style="border-color: {rating.color};">
            {#if nationImage}
                <img src={nationImage} alt={player.nationality} class="pm-flag" />
            {/if}
        </div>

        <a
            href={`/player/${player.id}`}
            class="pm-name"
            onmouseenter={(e) => e.stopPropagation()}
        >
            {player.player_name}
        </a>

        {#if player.player_team}
            <span class="pm-team">{player.player_team}</span>
        {/if}
    </div>
{/if}

<style>
    .pm-player {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.15rem;
        width: 4.5rem;
        cursor: default;
    }

    .pm-ring {
        width: 52px;
        height: 52px;
        border-radius: 50%;
        border: 4px solid #cbd5e1;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f1f5f9;
        transition: border-color 0.2s ease;
        overflow: hidden;
    }

    .pm-flag {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 50%;
    }

    .did-not-play .pm-ring {
        opacity: 0.55;
        filter: grayscale(0.6);
    }

    .pm-name {
        font-size: 0.65rem;
        font-weight: 600;
        color: #1e293b;
        text-align: center;
        max-width: 4.5rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-decoration: none;
    }

    .pm-name:hover {
        text-decoration: underline;
        color: #2563eb;
    }

    .pm-team {
        font-size: 0.55rem;
        color: #94a3b8;
        text-align: center;
        max-width: 4.5rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
</style>