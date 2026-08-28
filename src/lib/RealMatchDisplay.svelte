<script lang="ts">
    let { match, upcoming = false }: { match: any; upcoming?: boolean } = $props();

    const teams = $derived.by(() => {
        const parts = (match?.name ?? '').split(' vs ');
        return { home: parts[0] ?? 'Unknown', away: parts[1] ?? 'Unknown' };
    });

    const score = $derived.by(() => {
        const current = (match?.scores ?? []).filter((s: any) => s.description === 'CURRENT');
        if (current.length === 0) return null;
        const home = current.find((s: any) => s.score?.participant === 'home')?.score?.goals;
        const away = current.find((s: any) => s.score?.participant === 'away')?.score?.goals;
        if (home == null || away == null) return null;
        return { home, away };
    });

    function formatDate(startingAt: string): string {
        if (!startingAt) return '';
        const d = new Date(startingAt.replace(' ', 'T') + 'Z');
        return d.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    function formatTime(startingAt: string): string {
        if (!startingAt) return '';
        const d = new Date(startingAt.replace(' ', 'T') + 'Z');
        return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    }
</script>

<div class="match-box">
    <div class="match-date">
        {formatDate(match.starting_at)}
        {#if upcoming}
            <span class="match-time">{formatTime(match.starting_at)}</span>
        {/if}
    </div>

    <div class="match-row">
        <span class="team-name">{teams.home}</span>
        <span class="match-score">
            {#if score}
                {score.home}&ndash;{score.away}
            {:else}
                vs
            {/if}
        </span>
        <span class="team-name away">{teams.away}</span>
    </div>
</div>

<style>
    .match-box {
        background: #f9f9f9;
        border: 1px solid #eee;
        border-radius: 8px;
        padding: 0.85rem 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .match-date {
        font-size: 0.7rem;
        color: #888;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        display: flex;
        justify-content: space-between;
    }

    .match-time {
        color: #aaa;
        text-transform: none;
        letter-spacing: 0;
    }

    .match-row {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        gap: 0.75rem;
    }

    .team-name {
        font-size: 0.85rem;
        color: #333;
        font-weight: 500;
        text-align: right;
    }

    .team-name.away {
        text-align: left;
    }

    .match-score {
        font-size: 1.15rem;
        font-weight: 700;
        color: #222;
        min-width: 52px;
        text-align: center;
        white-space: nowrap;
    }
</style>