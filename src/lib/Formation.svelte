<script>
    import FormationPlayer from "./FormationPlayer.svelte";

    let {
        team = {}
    } = $props()


    const rowOrder = ['attackers', 'midfielders', 'defenders', 'keepers'];
</script>


<div class='field'>
    {#each rowOrder as group}
        {#if team.selected?.[group]}
            <div class="formation-row">
                {#each Object.entries(team.selected[group]) as [positionName, positionData]}
                    {#each positionData.players as player}
                        <FormationPlayer player={player} currentPosition={positionName}/>
                    {/each}
                {/each}
            </div>
        {/if}
    {/each}
</div>

<style>
    .field {
        background: linear-gradient(#228B22, #006400); /* generic green gradient */
        width: 100%;
        height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: space-around;
        padding: 2rem 0;
        border: 4px solid #004d00;
        box-shadow: inset 0 0 30px #002200;
    }
    
    .formation-row {
        display: flex;
        justify-content: center;
        gap: 2rem;
    }
    </style>
    