<script lang="ts">
  import { injuredByTeam, injuredByFantasyTeam } from '$lib/stores/generic.svelte';
  import { onMount } from 'svelte';

  let { mini = false }: { mini?: boolean } = $props();

  let now = $state<Date>(new Date());
  let showFantasy = $state<boolean>(true);

  let activeData = $derived(showFantasy ? injuredByFantasyTeam : injuredByTeam);

  onMount(() => {
    now = new Date();
  });

  function daysOut(startDate: string | Date): number {
    const start = new Date(startDate);
    const diff = now.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  function sortedTeams(): string[] {
    return Object.keys(activeData).sort();
  }

  function sortedPlayers(team: string) {
    return [...activeData[team]].sort((a, b) => {
      return daysOut(a.injured.start_date) - daysOut(b.injured.start_date);
    });
  }

  let allPlayers = $derived(Object.values(activeData).flat());
</script>

{#if mini}
  <div class="w-[400px] text-sm">
    <div class="flex items-center justify-between border-b border-gray-200 py-1">
      <span class="font-semibold text-gray-500">Team</span>
      <span class="font-semibold text-gray-500 w-[70px] text-right">Players Out</span>
    </div>
    {#each Object.entries(injuredByFantasyTeam).sort(([a], [b]) => a.localeCompare(b)) as [teamName, players]}
      <div class="flex items-center justify-between py-1 border-b border-gray-100">
        <span class="truncate max-w-[180px] font-medium">{teamName}</span>
        <span class="font-bold w-[70px] text-right">{players.length}</span>
      </div>
    {/each}
  </div>
{:else}
  <div class="injury-table">
    <div class="toggle-row">
      <button 
        class="toggle-btn" 
        class:active={showFantasy}
        onclick={() => showFantasy = true}
      >Fantasy Teams</button>
      <button 
        class="toggle-btn" 
        class:active={!showFantasy}
        onclick={() => showFantasy = false}
      >Real Teams</button>
    </div>

    {#each sortedTeams() as team}
      <div class="team-section">
        <h3 class="team-header">{team}</h3>
        {#each sortedPlayers(team) as player}
          <div class="injury-row">
            <span class="player-name">{player.player_name}</span>
            <span class="category" class:suspended={player.injured.category === 'suspended'} class:injury={player.injured.category === 'injury'}>
              {player.injured.category}
            </span>
            <span class="days-out">{daysOut(player.injured.start_date)} days</span>
          </div>
        {/each}
      </div>
    {:else}
      <p class="no-injuries">No injuries to show.</p>
    {/each}
  </div>
{/if}

<style>
  .injury-table {
    padding: 1rem;
    max-width: 600px;
  }

  .toggle-row {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .toggle-btn {
    padding: 0.35rem 0.75rem;
    font-size: 0.8rem;
    border: 1px solid #555;
    background: transparent;
    color: #aaa;
    cursor: pointer;
    border-radius: 3px;
  }

  .toggle-btn.active {
    background: #333;
    color: #fff;
    border-color: #888;
  }

  .team-header {
    margin: 1.2rem 0 0.4rem;
    font-size: 1rem;
    border-bottom: 1px solid #444;
    padding-bottom: 0.25rem;
  }

  .injury-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.3rem 0;
    font-size: 0.85rem;
  }

  .player-name {
    flex: 1;
  }

  .category {
    width: 80px;
    text-align: center;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    border-radius: 3px;
    padding: 2px 6px;
  }

  .category.injury {
    color: #e74c3c;
  }

  .category.suspended {
    color: #e67e22;
  }

  .days-out {
    width: 70px;
    text-align: right;
    font-size: 0.8rem;
    color: #999;
  }

  .no-injuries {
    color: #777;
    font-size: 0.85rem;
    margin-top: 1rem;
  }
</style>