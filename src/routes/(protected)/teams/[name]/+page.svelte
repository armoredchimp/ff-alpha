<script>
  import { onMount } from "svelte";
  import TeamHeader from "$lib/TeamHeader.svelte";
  import TeamScores from "$lib/TeamScores.svelte";
  import Formation from "$lib/Formation.svelte";
  import { formationConfig } from "$lib/data/formationConfig";
  import SelectedList from "$lib/SelectedList.svelte";
  import { createFormationStructure, populateLineup } from "$lib/utils";

  let { data } = $props();

  onMount(() => {
    // prepare structure and then fill positions
    data.team.selected = createFormationStructure(data.team.formation);
    populateLineup(data.team);
    console.log("FINAL selected:", data.team.selected);
  });

  
</script>
<div class="page-container">
  <div>
      <TeamHeader team={data.team} computer={true} />
  </div>
  <div>
      <TeamScores scores={data.team.scores.total} playerCount={data.team.playerCount} keeperCount={data.team.keepers.length}/>
  </div>

  <div class="middle-section">
      <Formation team={data.team} />
      <SelectedList team={data.team}/>
  </div>

</div>

<style>
  .middle-section {
      display: flex;
  }
</style>