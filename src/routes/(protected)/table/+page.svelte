<script>
    import Table from "$lib/Table.svelte";
    import { teams, playerTeam } from "$lib/stores/teams.svelte";

</script>


<Table teams={teams} playerTeam={playerTeam}/>