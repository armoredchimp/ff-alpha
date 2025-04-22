
<script>
    import SelectedPlayer from './SelectedPlayer.svelte';
  
    let {
      team = {}
    } = $props();
  
    const rowOrder = ['attackers', 'midfielders', 'defenders', 'keepers'];
  </script>
  
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

    {#if team.unused?.length}
      <!-- Render list of players not selected -->
      {#each team.unused as player}
        <SelectedPlayer
          player={player}
          position="Not Selected"
          posGroup="unused"
        />
      {/each}
    {/if}

  </div>
  