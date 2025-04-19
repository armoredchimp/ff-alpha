<script>
    import { playerTeam, teams } from "$lib/stores/teams.svelte";
    import Formation from "$lib/Formation.svelte";
    import SelectedList from "$lib/SelectedList.svelte";
    import TeamHeader from "$lib/TeamHeader.svelte";
    import TeamScores from "$lib/TeamScores.svelte";
	import { onMount } from "svelte";
    import { createFormationStructure } from "$lib/utils/utils";


    onMount(()=>{
        playerTeam.selected = createFormationStructure(playerTeam.formation)
    })


</script>


<div class="page-container">
    <div>
        <TeamHeader team={playerTeam} computer={false} />
    </div>
    <div>
        <TeamScores scores={playerTeam.scores} playerCount={playerTeam.playerCount} keeperCount={playerTeam.keepers.length}/>
    </div>

    <div class="middle-section">
        <Formation team={playerTeam} />
        <SelectedList team={playerTeam}/>
    </div>

</div>

<style>
    .middle-section {
        display: flex;
    }
</style>