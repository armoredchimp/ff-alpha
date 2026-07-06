<script>
    import { onMount, onDestroy } from 'svelte';
    import { goto } from '$app/navigation';
    import { currentWeekDeadlines } from './utils';

    // FLAG: set to your team selection route
    const TEAM_ROUTE = '/teams/player/main';

    let home = $state(null);      // null while loading; true/false once known
    let noTeam = $state(false);
    let now = $state(new Date());
    let interval;

    onMount(async () => {
        try {
            const res = await fetch('/api/supabase/lineup_status');
            const data = await res.json();
            if (data.noTeam) noTeam = true;
            else home = data.home;
        } catch {
            noTeam = true;
        }
        interval = setInterval(() => { now = new Date(); }, 60000);
    });
    onDestroy(() => clearInterval(interval));

    let deadlines = $derived(currentWeekDeadlines(now));
    let showAwayLock = $derived(
        home === true && !deadlines.matchesInProgress && now < deadlines.awayLock
    );

    function fmt(target) {
        const ms = target.getTime() - now.getTime();
        if (ms <= 0) return 'soon';
        const totalMin = Math.floor(ms / 60000);
        const d = Math.floor(totalMin / 1440);
        const h = Math.floor((totalMin % 1440) / 60);
        const m = totalMin % 60;
        const parts = [];
        if (d > 0) parts.push(`${d}d`);
        if (h > 0 || d > 0) parts.push(`${h}h`);
        parts.push(`${m}m`);
        return parts.join(' ');
    }
</script>

{#if !noTeam && home !== null}
    <button class="lineup-countdown" onclick={() => goto(TEAM_ROUTE)}>
        {#if deadlines.matchesInProgress}
            <span class="cd-primary">Matches in progress…</span>
        {:else}
            <span class="cd-primary">Set your lineup · kickoff in {fmt(deadlines.kickoff)}</span>
            {#if showAwayLock}
                <span class="cd-secondary">Opponent locks in {fmt(deadlines.awayLock)}</span>
            {/if}
        {/if}
    </button>
{/if}

<style>
    .lineup-countdown {
        display: inline-flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.15rem;
        padding: 0.5rem 0.9rem;
        background: #f1f5f9;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        cursor: pointer;
        text-align: left;
        transition: background 0.15s;
    }
    .lineup-countdown:hover { background: #e2e8f0; }
    .cd-primary { font-size: 0.85rem; font-weight: 600; color: #1e293b; line-height: 1.2; }
    .cd-secondary { font-size: 0.72rem; color: #64748b; line-height: 1.2; }
</style>