<script lang="ts">
  import LastMatch from "$lib/LastMatch.svelte";
  import type { Team } from '$lib/types/types';
  import type { PageData } from './$types';

  let { data }: { data: PageData & { team: Team; matchDetails: any } } = $props();
</script>

<div class="page-container">
  <div class="top-buttons">
    <button><a href="/teams/player/main">Back</a></button>
  </div>

  {#if data.matchDetails}
    <LastMatch 
      details={data.matchDetails}
      isHome={data.team.lastResult.home}
      team={data.team}
    />
  {:else}
    <p>No match data available</p>
  {/if}
</div>