
<script>
	import { onMount } from 'svelte';
  import SelectedPlayer from './SelectedPlayer.svelte';
  
    let {
      team = {}
    } = $props();
  
    const rowOrder = ['attackers', 'midfielders', 'defenders', 'keepers'];
 
  </script>

  
  <div class="field">
    {#each rowOrder as rowName}
      {#if team.selected?.[rowName]}
        {#each Object.entries(team.selected[rowName]) as [positionName, { players, max }]}
          {#each Array(max) as _, idx}
            <SelectedPlayer
              player={players[idx]}
              position={positionName}
              posGroup={rowName}
            />
          {/each}
        {/each}
      {/if}
    {/each}

  <!-- actual subs -->
  {#each team.subs as player, index}
    <SelectedPlayer
      player={player}
      position={`Sub ${index + 1}`}
      posGroup="subs"
    />
  {/each}

  <!-- empty subs up to 7 total -->
  {#each Array(Math.max(0, 7 - (team.subs?.length || 0))) as _, idx}
    <SelectedPlayer
      position={`Sub ${ (team.subs?.length || 0) + idx + 1}`}
      posGroup="subs"
    />
  {/each}

    {#if team.unused.length}
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