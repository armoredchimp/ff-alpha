<script lang="ts">
  import SelectedPlayer from './SelectedPlayer.svelte';
  import type { Team } from "$lib/types/types";

  let {
    team = {} as Team
  } = $props<{
    team?: Team;
  }>();

  const rowOrder: string[] = ['attackers', 'midfielders', 'defenders', 'keepers'];
</script>

<div class="field">
  {#each rowOrder as rowName}
    {#if team.selected?.[rowName]}
      {#each Object.entries(team.selected[rowName]) as [positionName, positionData]}
        {#if positionData && typeof positionData === 'object' && 'players' in positionData && 'max' in positionData}
          {#each Array(positionData.max) as _, idx}
            <SelectedPlayer
              player={positionData.players[idx]}
              position={positionName}
              posGroup={rowName}
            />
          {/each}
        {/if}
      {/each}
    {/if}
  {/each}
  
  <!-- actual subs -->
  {#if team.subs}
    {#each team.subs as player, index}
      <SelectedPlayer
        player={player}
        position={`Sub ${index + 1}`}
        posGroup="subs"
      />
    {/each}
  {/if}
  
  <!-- empty subs up to 7 total -->
  {#each Array(Math.max(0, 7 - (team.subs?.length || 0))) as _, idx}
    <SelectedPlayer
      position={`Sub ${(team.subs?.length || 0) + idx + 1}`}
      posGroup="subs"
    />
  {/each}
  
  {#if team.unused?.length}
    {#each team.unused as player}
      <SelectedPlayer
        player={player}
        position="Not Selected"
        posGroup="unused"
      />
    {/each}
  {/if}
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
    max-width: 300px;
    margin: 0 auto;
  }
</style>