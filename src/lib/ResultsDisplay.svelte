<script lang="ts">
    import { results } from "./stores/generic.svelte";
    import { getPossessionColor, getPossessionPercentage } from "./utils/team";

    let { mini = false }: { mini?: boolean } = $props();
</script>

{#if mini}
  <div class="w-[400px] text-sm">
    <div class="border-b border-gray-200 py-1 mb-1">
      <span class="font-semibold text-gray-500">Last Results</span>
    </div>
    {#each Object.values(results) as match}
        <a href="/teams/{match.homeTeam?.player ? 'player' : match.homeTeam?.name?.toLowerCase()}/last" class="flex items-center py-0.5 border-b border-gray-100 no-underline text-inherit">
            <span class="truncate flex-1 font-medium text-right">{match.homeTeam?.name}</span>
            <span class="font-bold px-2 whitespace-nowrap">{match.homeScore} - {match.awayScore}</span>
            <span class="truncate flex-1 font-medium">{match.awayTeam?.name}</span>
        </a>
    {/each}
  </div>
{:else}
    <div class="results-list">
        {#each Object.values(results) as match}
            {@const homePoss = getPossessionPercentage(match.homePossWins, match.awayPossWins)}
            {@const awayPoss = getPossessionPercentage(match.awayPossWins, match.homePossWins)}
            <a href="/teams/{match.homeTeam?.player ? 'player' : match.homeTeam?.name?.toLowerCase()}/last" class="match-card">
                <div class="teams-row">
                    <span class="team-name home">{match.homeTeam?.name}</span>
                    <div class="score">
                        <span>{match.homeScore}</span>
                        <span class="divider">-</span>
                        <span>{match.awayScore}</span>
                    </div>
                    <span class="team-name away">{match.awayTeam?.name}</span>
                </div>
                <div class="details-row">
                    <span class="detail">Chances: {Math.round(match.homeChancePts / 15)} - {Math.round(match.awayChancePts / 15)}</span>
                    <span class="detail">
                        Poss: 
                        <span style="color: {getPossessionColor(homePoss)}">{homePoss}%</span>
                        -
                        <span style="color: {getPossessionColor(awayPoss)}">{awayPoss}%</span>
                    </span>
                </div>
            </a>
        {/each}
    </div>
{/if}

<style>
    .results-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 1rem;
        max-width: 600px;
        margin: 0 auto;
    }

    .match-card {
        display: flex;
        flex-direction: column;
        padding: 0.75rem 1rem;
        border-radius: 0.5rem;
        background: white;
        border: 1px solid #e5e7eb;
        text-decoration: none;
        color: inherit;
        transition: all 0.15s ease;
    }

    .match-card:hover {
        border-color: #93c5fd;
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
        transform: translateY(-1px);
    }

    .teams-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .team-name {
        flex: 1;
        font-size: 0.95rem;
        font-weight: 600;
        color: #1f2937;
    }

    .team-name.home {
        text-align: left;
    }

    .team-name.away {
        text-align: right;
    }

    .score {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 1.5rem;
        font-weight: 700;
        color: #111827;
        padding: 0 1rem;
    }

    .divider {
        color: #9ca3af;
    }

    .details-row {
        display: flex;
        justify-content: space-between;
        margin-top: 0.375rem;
        padding-top: 0.375rem;
        border-top: 1px solid #f3f4f6;
    }

    .detail {
        font-size: 0.75rem;
        color: #6b7280;
    }
</style>