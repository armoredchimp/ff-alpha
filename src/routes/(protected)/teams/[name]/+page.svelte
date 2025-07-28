<script>
  import { onMount } from "svelte";
  import TeamHeader from "$lib/TeamHeader.svelte";
  import TeamScores from "$lib/TeamScores.svelte";
  import Formation from "$lib/Formation.svelte";
  import { getCurrentTeamPage } from '$lib/stores/generic.svelte'
  import SelectedList from "$lib/SelectedList.svelte";
  import { createFormationStructure, populateLineup } from "$lib/utils";
	import { calculateTotalScores } from "../../../../lib/utils/team.js";
  // import { page} from '$app/state'


  let { data } = $props();


let currTeam = getCurrentTeamPage()

if (data){
  currTeam.setTeamPage(data.team.name.toLowerCase())
}

onMount(() => {

       data.team.selected = createFormationStructure(data.team.formation);
       calculateTotalScores(data.team)
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