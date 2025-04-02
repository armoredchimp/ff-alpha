<script>
    import { teams } from "$lib/stores/teams.svelte";
    import TeamHeader from "$lib/TeamHeader.svelte";


    let { data } = $props()


</script>

<div class="page-container">
    <div>
        <TeamHeader team={data.team} computer={true} />
    </div>

</div>