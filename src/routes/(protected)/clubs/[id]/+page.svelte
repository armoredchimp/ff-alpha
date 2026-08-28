<script lang="ts">
    import RealMatchDisplay from '$lib/RealMatchDisplay.svelte';

    let { data } = $props();

    const team = data.team;
</script>

<div class="club-page">
    {#if data.error}
        <p class="error">{data.error}</p>
    {:else if team}
        <div class="club-header">
            <div class="club-info">
                <div class="club-info-top">
                    <h1>{team.name}</h1>
                    {#if team.short_code}
                        <span class="club-code">{team.short_code}</span>
                    {/if}
                </div>
                <div class="club-details">
                    {#if team.founded}<span>Founded: {team.founded}</span>{/if}
                    {#if team.type}<span class="capitalize">{team.type}</span>{/if}
                </div>
            </div>
        </div>

        <div class="matches-section">
            <h3 class="section-title">Recent Matches</h3>
            {#if data.recentMatches.length > 0}
                <div class="match-list">
                    {#each data.recentMatches as match (match.id)}
                        <RealMatchDisplay {match} />
                    {/each}
                </div>
            {:else}
                <p class="placeholder-text">No recent matches.</p>
            {/if}
        </div>

        <div class="matches-section">
            <h3 class="section-title">Upcoming Matches</h3>
            {#if data.upcomingMatches.length > 0}
                <div class="match-list">
                    {#each data.upcomingMatches as match (match.id)}
                        <RealMatchDisplay {match} upcoming={true} />
                    {/each}
                </div>
            {:else}
                <p class="placeholder-text">No upcoming matches scheduled.</p>
            {/if}
        </div>
    {:else}
        <p>Club not found</p>
    {/if}
</div>

<style>
    .club-page {
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
    }

    .club-header {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        margin-bottom: 2rem;
    }

    .club-info {
        flex: 1;
    }

    .club-info h1 {
        margin: 0 0 0.5rem 0;
        font-size: 1.75rem;
    }

    .club-info-top {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 1rem;
    }

    .club-code {
        font-size: 0.8rem;
        color: #aaa;
        font-weight: 400;
        white-space: nowrap;
    }

    .club-details {
        display: flex;
        gap: 1.5rem;
        color: #555;
        font-size: 0.95rem;
    }

    .capitalize {
        text-transform: capitalize;
    }

    .section-title {
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #999;
        margin: 0 0 0.75rem 0;
        font-weight: 600;
    }

    .matches-section {
        border-top: 1px solid #eee;
        padding-top: 1.5rem;
        margin-bottom: 1.5rem;
    }

    .match-list {
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
    }

    .placeholder-text {
        color: #888;
        font-style: italic;
    }

    .error {
        color: #dc2626;
    }
</style>