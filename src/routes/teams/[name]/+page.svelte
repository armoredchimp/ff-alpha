<script>
    import { onMount } from "svelte";
    import { teams } from "$lib/stores/teams.svelte";
    import TeamHeader from "$lib/TeamHeader.svelte";
    import TeamScores from "$lib/TeamScores.svelte";
    import { formationConfig } from "$lib/data/formationConfig";

    let { data } = $props()

    onMount(() => {
        data.team.selected = createFormationStructure(data.team.formation)
    })

    function createFormationStructure(formationName){
        const config = formationConfig[formationName]
        const structure = {}

        config.forEach(([group, ...positions]) => {
            structure[group] = {},
            positions.forEach(([pos, max]) => {
                structure[group][pos] = {
                    players: [],
                    max: max
                }
            })
        })
    }
</script>

<div class="page-container">
    <button><a href="/..">Home</a></button>
    <div>
        <TeamHeader team={data.team} computer={true} />
    </div>
    <div>
        <TeamScores scores={data.team.scores} playerCount={data.team.playerCount}/>
    </div>

</div>