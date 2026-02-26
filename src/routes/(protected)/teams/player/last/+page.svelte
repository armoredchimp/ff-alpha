<script lang="ts">
  import LastMatch from "$lib/LastMatch.svelte";
  import type { Team } from '$lib/types/types';
  import type { PageData } from './$types';

  let { data }: { data: PageData & { team: Team; matchDetails: any } } = $props();

  console.log('[last page] team:', data.team?.name, 'matchDetails:', data.matchDetails);
</script>

<div class="page-container">
  <div class="top-buttons">
    {#if data.team}
      <button><a href="/teams/player/main">Back</a></button>
    {/if}
  </div>

  {#if !data.team}
    <p>Team not found</p>
  {:else if data.matchDetails}
    <LastMatch 
      goalDetails={data.matchDetails.goal_details}
      chanceBreakdown={data.matchDetails.chance_breakdown}
      posBreakdown={data.matchDetails.possession_breakdown}
      isHome={data.team.lastResult.home}
      team={data.team}
    />
  {:else}
    <p>No match data available</p>
  {/if}
</div>