<script lang="ts">
    import Formation from "$lib/Formation.svelte";
    import { teams, playerTeam } from "$lib/stores/teams.svelte";

</script>

<div style="display: flex;">

    <!-- <Formation team={playerTeam} /> -->
    
    <Formation team={teams.team1} />

</div>
